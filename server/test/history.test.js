import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app.js';
import Match from '../src/models/match.model.js';
import User from '../src/models/user.model.js';
import Problem from '../src/models/problem.model.js';

test('private history and persistent results: aggregates, sorting, projection and deleted records', async () => {
  const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  let server;
  process.env.JWT_SECRET = 'history-test-only';
  try {
    await mongoose.connect(database.getUri());
    const [a,b,c] = await User.create(['a','b','c'].map(username => ({ username, email: `${username}@private.invalid`, password: 'private-password' })));
    const fresh = await User.create({ username: 'fresh', email: 'fresh@private.invalid', password: 'unused' });
    const problem = await Problem.create({ title: 'Sum', description: 'private-description', difficulty: 'easy', starterCode: 'function solve(){}', sampleTestCases: [{ input: '[1]', expectedOutput: '1' }], hiddenTestCases: [{ input: 'secret-input', expectedOutput: 'secret-output' }] });
    const start = new Date(Date.now() - 600000);
    const base = { player1: a._id, player2: b._id, problem: problem._id, status: 'completed', startedAt: start, endsAt: new Date() };
    const win = await Match.create({ ...base, winner: a._id });
    const loss = await Match.create({ ...base, winner: b._id });
    const draw = await Match.create(base);
    await Match.create({ ...base, player1: b._id, player2: c._id });
    await Match.create({ ...base, status: 'in_progress' });
    await Match.updateOne({ _id: win._id }, { updatedAt: new Date(Date.now() - 10000) }, { timestamps: false });
    server = createServer(app); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/matches`;
    const request = (path, user = a) => fetch(baseUrl + path, { headers: user ? { Cookie: `token=${jwt.sign({ id: String(user._id) },process.env.JWT_SECRET)}` } : {} });
    assert.equal((await request('/history', null)).status,401);
    assert.deepEqual(await (await request('/history', fresh)).json(), { matches: [], stats: { total: 0, wins: 0, losses: 0, draws: 0, winRate: 0 } });
    const response = await request('/history?userId='+c._id); assert.equal(response.status,200);
    const history = await response.json();
    assert.equal(history.matches.length,3); assert.equal(history.matches.at(-1)._id,String(win._id));
    assert.ok(Math.abs(history.stats.winRate - 100/3) < 0.00001);
    assert.deepEqual({ ...history.stats, winRate: 0 },{ total:3,wins:1,losses:1,draws:1,winRate:0 });
    for (const forbidden of ['private.invalid','private-password','secret-input','secret-output','hiddenTestCases','starterCode','private-description']) assert.equal(JSON.stringify(history).includes(forbidden),false);
    for (const match of [win,loss,draw]) {
      const one = await (await request(`/${match._id}/result`)).json();
      const refreshed = await (await request(`/${match._id}/result`)).json();
      assert.deepEqual(refreshed,one);assert.equal(one.match.winner,match.winner ? String(match.winner) : null);
    }
    assert.equal((await request(`/${win._id}/result`, c)).status,403);
    assert.equal((await request('/bad-id/result')).status,400);
    assert.equal((await request(`/${new mongoose.Types.ObjectId()}/result`)).status,404);
    await User.deleteOne({ _id: b._id }); await Problem.deleteOne({ _id: problem._id });
    const recovered = await (await request(`/${loss._id}/result`)).json();
    assert.equal(recovered.match.player2.username,'Deleted player');assert.equal(recovered.match.player2._id,String(b._id));assert.equal(recovered.match.winner,String(b._id));assert.equal(recovered.match.problem.title,'Deleted problem');
    assert.equal((await (await request('/history')).json()).stats.total,3);
  } finally { if(server) await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();await database.stop(); }
});
