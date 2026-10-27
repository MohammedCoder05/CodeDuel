import { createSubmissionService } from '../services/submission.service.js';
import { finishMatch } from '../services/matchLifecycle.service.js';
import { JudgeError } from '../services/judge0.service.js';
const judgeSubmission = createSubmissionService({ finish: finishMatch });
export const executeMatchCode = submit => async (req, res) => {
    try {
        const result = await judgeSubmission(req.id, req.params.matchId, req.body?.code, submit);
        return res.json(result);
    } catch (error) {
        return res.status(error instanceof JudgeError ? error.status : 503).json({ message: error instanceof JudgeError ? error.message : 'Judging unavailable. Please retry shortly.' });
    }
};
import mongoose from "mongoose";
import Match from "../models/match.model.js";
export const getMatchById = async (req, res) => {
    try {
        const { matchId } = req.params;


        if (!mongoose.isValidObjectId(matchId)) {
            return res.status(400).json({
                message: "Invalid Match ID"
            });
        }

        const match = await Match.findById(matchId).populate("player1", "username").populate("player2", "username").populate("problem", "title description difficulty starterCode sampleTestCases");
        if (!match) {
            return res.status(404).json({
                message: "Match not found"
            });
        }
        if (!match.problem) {
            return res.status(404).json({
                message: "Problem not found"
            });
        }

        const userId = req.id.toString();
        const isPlayer1 = match.player1?._id.toString() === userId;
        const isPlayer2 = match.player2?._id.toString() === userId;

        if (!isPlayer1 && !isPlayer2) {
            return res.status(403).json({
                message: "You are not authorized to view this match"
            });
        }
        return res.status(200).json({
            match
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};