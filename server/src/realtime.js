import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import User from './models/user.model.js';
import Problem from './models/problem.model.js';
import Match from './models/match.model.js';
import { setMatchPublisher, startDeadlineMonitor, publicResult } from './services/matchLifecycle.service.js';

export function setupRealtime(io) {
        setMatchPublisher(result => io.to(result._id).emit('match_completed', result));
        const stopMonitor = startDeadlineMonitor();
        let waitingPlayer = null;
        const pairingUsers = new Set();
        io.use(async (socket, next) => {
            try {
                const cookieHeader = socket.handshake.headers.cookie;

                if (!cookieHeader) {
                    return next(new Error("Unauthorized"));
                }

                const cookies = parseCookie(cookieHeader);
                const token = cookies.token;

                if (!token) {
                    return next(new Error("Unauthorized"));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                const user = await User.findById(decoded.id).select("-password");

                if (!user) {
                    return next(new Error("Unauthorized"));
                }

                socket.user = user;

                next();

            } catch (error) {
                next(new Error("Unauthorized"));
            }
        });
        io.on("connection", (socket) => {
            socket.on('watch_match', async (matchId, acknowledge) => {
                if (typeof acknowledge !== 'function') return;
                try {
                    if (typeof matchId !== 'string' || !/^[a-f0-9]{24}$/i.test(matchId)) return acknowledge({ error: 'Invalid match.' });
                    const match = await Match.findById(matchId);
                    if (!match || ![match.player1, match.player2].some(id => String(id) === String(socket.user._id))) return acknowledge({ error: 'Match unavailable.' });
                    await socket.join(matchId);
                    acknowledge({ match: publicResult(match) });
                } catch { acknowledge({ error: 'Unable to watch match.' }); }
            });
            console.log("Client connected:", socket.id);
            console.log("Authenticated user:", socket.user.username);
            console.log("User ID:", socket.user._id);

            socket.on("find_match", async () => {
                const userId = String(socket.user._id);
                if (pairingUsers.has(userId)) return;
                pairingUsers.add(userId);
                let pairedUserId;
                try {
                const existing = await Match.findOne({ status: 'in_progress', endsAt: { $gt: new Date() }, $or: [{ player1: socket.user._id }, { player2: socket.user._id }] }).select('_id');
                if (!socket.connected) return;
                if (existing) {
                    await socket.join(String(existing._id));
                    socket.emit('match_found', { message: 'Returning to your active match.', matchId: String(existing._id) });
                    return;
                }
                console.log("Player searching for match", socket.id);
                if (waitingPlayer === null) {
                    waitingPlayer = {
                        socketId: socket.id,
                        userId: socket.user._id.toString()
                    }
                    socket.emit("match_searching", { message: "Waiting for an opponent..." })
                } else if (waitingPlayer.userId === socket.user._id.toString()) {
                    socket.emit("match_searching", {
                        message: "You are already searching from another tab."
                    });
                    return;
                } else {
                    console.log(`Match found between ${waitingPlayer.socketId} and ${socket.id}`);

                    const opponent = waitingPlayer;
                    waitingPlayer = null;
                    pairedUserId = opponent.userId;
                    pairingUsers.add(pairedUserId);

                    try {
                        const problems = await Problem.aggregate([
                            { $sample: { size: 1 } }
                        ]);

                        const problem = problems[0];

                        if (!problem) {
                            io.to(opponent.socketId).emit("match_error", {
                                message: "No problems available. Please try again later!"
                            });

                            socket.emit("match_error", {
                                message: "No problems available. Please try again later!"
                            });

                            return;
                        }

                        const opponentSocket = io.sockets.sockets.get(opponent.socketId);

                        if (!opponentSocket || !socket.connected) {
                            socket.emit("match_error", {
                                message: "Opponent disconnected. Please search again."
                            });
                            return;
                        }

                        const match = await Match.create({
                            player1: opponent.userId,
                            player2: socket.user._id,
                            problem: problem._id,
                            status: "in_progress",
                            startedAt: new Date(),
                            endsAt: new Date(Date.now() + 10 * 60 * 1000)
                        });
                        const currentOpponentSocket = io.sockets.sockets.get(opponent.socketId);

                        if (!currentOpponentSocket || !socket.connected) {
                            await Match.findByIdAndDelete(match._id);

                            if (socket.connected) {
                                socket.emit("match_error", {
                                    message: "Opponent disconnected. Please search again."
                                });
                            }

                            if (currentOpponentSocket) {
                                currentOpponentSocket.emit("match_error", {
                                    message: "Opponent disconnected. Please search again."
                                });
                            }
                            return;
                        }
                        const roomId = match._id.toString();

                        socket.join(roomId);
                        currentOpponentSocket.join(roomId);
                        const room = io.sockets.adapter.rooms.get(roomId);

                        console.log("Room ID:", roomId);
                        console.log("Players in room:", room?.size);

                        io.to(roomId).emit("match_found", {
                            message: "Opponent found!",
                            matchId:roomId
                        });

                    } catch (error) {
                        console.error("Matchmaking failed:", error);

                        io.to(opponent.socketId).emit("match_error", {
                            message: "Matchmaking failed. Please try again."
                        });

                        socket.emit("match_error", {
                            message: "Matchmaking failed. Please try again."
                        });
                    }
                }
                } catch {
                    socket.emit('match_error', { message: 'Unable to join matchmaking. Please retry.' });
                } finally {
                    pairingUsers.delete(userId);
                    if (pairedUserId) pairingUsers.delete(pairedUserId);
                }
            });
            socket.on("disconnect", () => {
                console.log("Client disconnected:", socket.id);

                if (waitingPlayer?.socketId === socket.id) {
                    waitingPlayer = null;
                }
            })
        })
    return stopMonitor;
}
