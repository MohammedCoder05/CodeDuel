import express from "express";
import {createProblem,getAllProblems,getProblemById} from "../controllers/problem.controllers.js";
import { protect } from "../middleware/auth.middleware.js";
const router = express.Router();

// Problem authoring is server-admin only; never put this key in the frontend.
router.post('/', protect, (req, res, next) => {
    if (!process.env.PROBLEM_ADMIN_KEY || req.get('X-Problem-Admin-Key') !== process.env.PROBLEM_ADMIN_KEY) return res.status(403).json({ message: 'Problem authoring is restricted.' });
    next();
}, createProblem)
router.get("/", protect,getAllProblems)
router.get("/:id", protect, getProblemById)

export default router

