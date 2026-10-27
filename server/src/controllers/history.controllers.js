import mongoose from 'mongoose';
import Match from '../models/match.model.js';
import User from '../models/user.model.js';
import Problem from '../models/problem.model.js';

// Explicit projection: no source code, hidden cases, email, or password is loaded.
async function present(matches) {
  const [users, problems] = await Promise.all([
    User.find({ _id: { $in: matches.flatMap(m => [m.player1, m.player2]).filter(Boolean) } }).select('username').lean(),
    Problem.find({ _id: { $in: matches.map(m => m.problem).filter(Boolean) } }).select('title').lean(),
  ]);
  const names = new Map(users.map(u => [String(u._id), u.username]));
  const titles = new Map(problems.map(p => [String(p._id), p.title]));
  const player = id => id ? { _id: String(id), username: names.get(String(id)) || 'Deleted player' } : null;
  return matches.map(m => ({
    _id: String(m._id), status: m.status, winner: m.winner ? String(m.winner) : null,
    player1: player(m.player1), player2: player(m.player2),
    problem: { title: titles.get(String(m.problem)) || 'Deleted problem' },
    startedAt: m.startedAt, endsAt: m.endsAt,
    // In the existing model the finalization transaction records updatedAt.
    completedAt: m.status === 'completed' ? m.updatedAt : null,
  }));
}
const fields = 'player1 player2 problem status winner startedAt endsAt updatedAt';
export async function getHistory(req, res) {
  try {
    const matches = await Match.find({ status: 'completed', $or: [{ player1: req.id }, { player2: req.id }] }).select(fields).sort({ updatedAt: -1, _id: -1 }).lean();
    const wins = matches.filter(m => String(m.winner) === String(req.id)).length;
    const draws = matches.filter(m => !m.winner).length;
    const total = matches.length;
    res.json({ matches: await present(matches), stats: { total, wins, losses: total - wins - draws, draws, winRate: total ? wins / total * 100 : 0 } });
  } catch { res.status(500).json({ message: 'Unable to load match history.' }); }
}
export async function getResult(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.matchId)) return res.status(400).json({ message: 'Invalid match ID.' });
    const match = await Match.findById(req.params.matchId).select(fields).lean();
    if (!match) return res.status(404).json({ message: 'Match not found.' });
    if (![match.player1, match.player2].some(id => String(id) === String(req.id))) return res.status(403).json({ message: 'This match is private.' });
    res.json({ match: (await present([match]))[0] });
  } catch { res.status(500).json({ message: 'Unable to load match result.' }); }
}
