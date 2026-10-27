import express from "express";
import { getMatchById, executeMatchCode } from "../controllers/match.controllers.js";
import { protect } from "../middleware/auth.middleware.js";

import { getHistory, getResult } from '../controllers/history.controllers.js';

const router = express.Router();

router.get('/history', protect, getHistory);
router.get('/:matchId/result', protect, getResult);

router.get("/:matchId", protect, getMatchById);

router.post('/:matchId/run', protect, executeMatchCode(false));
router.post('/:matchId/submit', protect, executeMatchCode(true));
export default router;