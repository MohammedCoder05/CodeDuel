import express from 'express'
import userRouter from './routes/user.routes.js'
import problemRouter from './routes/problem.routes.js'
import matchRoutes from "./routes/match.routes.js";
import cookieParser from 'cookie-parser'
import cors from 'cors'
const app = express()
app.use(cors({
    origin: "http://localhost:5173",
    credentials:true
}))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/api/auth", userRouter)
app.use("/api/problems", problemRouter)
app.use("/api/matches", matchRoutes);
app.get('/api/health', (req, res) => {
    res.status(200).json({
        "status": "ok",
        "message": "CodeDuel backend is running"
    })
})


export default app