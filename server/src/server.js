import app from './app.js'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/db.js'
import { setupRealtime } from './realtime.js';

const PORT = process.env.PORT || 8080;
//For Socket.IO, we want access to that HTTP server so both Express and Socket.IO can use it.
async function startServer() {
    try {
        await connectDB();

        const httpServer = createServer(app);
        const allowedOrigins = [
            "http://localhost:5173",
            process.env.CLIENT_URL
        ].filter(Boolean);

        const io = new Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                credentials: true
            }
        });
        setupRealtime(io);
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })



    } catch (error) {
        console.error(`Server failed to start: ${error.message}`)
    }
}
startServer();
