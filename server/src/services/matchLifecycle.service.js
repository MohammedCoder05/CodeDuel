import mongoose from 'mongoose';
import Match from '../models/match.model.js';
import User from '../models/user.model.js';
import { JudgeError } from './judge0.service.js';
export const publicResult = match => ({ _id: String(match._id), status: match.status, winner: match.winner ? String(match.winner) : null });
let publish = () => {};
export const setMatchPublisher = callback => { publish = callback; };

export async function finishMatch(matchId, winner = null) {
  let completed;
  await mongoose.connection.transaction(async session => {
    const now = new Date();
    const filter = { _id: matchId, status: 'in_progress', endsAt: winner ? { $gt: now } : { $lte: now } };
    if (winner) filter.$or = [{ player1: winner }, { player2: winner }];
    completed = await Match.findOneAndUpdate(filter, { $set: { status: 'completed', winner } }, { returnDocument: 'after', session });
    if (!completed) return;
    if (winner) {
      const loser = String(completed.player1) === String(winner) ? completed.player2 : completed.player1;
      await User.updateOne({ _id: winner }, { $inc: { wins: 1 } }, { session });
      await User.updateOne({ _id: loser }, { $inc: { losses: 1 } }, { session });
    }
  });
  if (completed) { const result = publicResult(completed); publish(result); return result; }
  if (winner) throw new JudgeError('The match has already ended.', 409);
  return null;
}

export async function expireMatches() {
  const matches = await Match.find({ status: 'in_progress', endsAt: { $lte: new Date() } }).select('_id').limit(100);
  for (const match of matches) await finishMatch(match._id);
}
export function startDeadlineMonitor() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await expireMatches(); } catch (error) { console.error('Match deadline check failed:', error.message); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(tick, 1000); timer.unref();
  return () => clearInterval(timer);
}
