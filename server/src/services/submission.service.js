import mongoose from 'mongoose';
import Match from '../models/match.model.js';
import Problem from '../models/problem.model.js';
import { JudgeError, judgeCases } from './judge0.service.js';

export function validateMatch(match, userId, now = Date.now()) {
  if (!match) throw new JudgeError('Match not found.', 404);
  if (![match.player1, match.player2].some(id => String(id) === String(userId))) throw new JudgeError('This match is private.', 403);
  if (match.status !== 'in_progress' || !match.endsAt || new Date(match.endsAt).getTime() <= now) throw new JudgeError('This match is completed or expired.', 409);
}

export function createSubmissionService({ getMatch = id => Match.findById(id), getProblem = id => Problem.findById(id).select('+hiddenTestCases'), judge = judgeCases, finish = async () => {} } = {}) {
  const active = new Set();
  const requests = new Map();
  return async (userId, matchId, code, submit) => {
    if (!mongoose.isValidObjectId(matchId)) throw new JudgeError('Invalid match ID.', 400);
    const key = `${userId}:${matchId}`;
    if (active.has(key)) throw new JudgeError('Your previous request is still judging.', 429);
    if (active.size >= 4) throw new JudgeError('Judge is busy. Please retry shortly.', 429);
    const now = Date.now();
    for (const [id, entry] of requests) if (entry.until <= now) requests.delete(id);
    const rate = requests.get(String(userId)) || { count: 0, until: now + 60000 };
    if (rate.count >= 10) throw new JudgeError('Please wait before judging more code.', 429);
    rate.count++; requests.set(String(userId), rate);
    active.add(key);
    try {
      const match = await getMatch(matchId);
      validateMatch(match, userId);
      const problem = await getProblem(match.problem);
      if (!problem) throw new JudgeError('Problem unavailable.', 404);
      const result = await judge(code, submit ? problem.hiddenTestCases : problem.sampleTestCases, { hidden: submit });
      // Deadline and status must be checked again after remote execution.
      validateMatch(await getMatch(matchId), userId);
      if (submit && result.verdict === 'Accepted') return { ...result, match: await finish(matchId, userId) };
      return result;
    } finally { active.delete(key); }
  };
}
