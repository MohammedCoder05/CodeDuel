import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Match from '../src/models/match.model.js';
import User from '../src/models/user.model.js';
import { finishMatch, expireMatches, setMatchPublisher } from '../src/services/matchLifecycle.service.js';

test('real Mongo transactions: one winner, exactly-once stats, deadline draw and broadcast', async () => {
 const database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
 try {
  await mongoose.connect(database.getUri());
  const [a,b] = await User.create([{username:'a',email:'a@test.invalid',password:'unused'},{username:'b',email:'b@test.invalid',password:'unused'}]);
  const base={player1:a._id,player2:b._id,problem:new mongoose.Types.ObjectId(),status:'in_progress'};
  const match=await Match.create({...base,endsAt:new Date(Date.now()+60000)});
  const messages=[];setMatchPublisher(result=>messages.push(result));
  const races=await Promise.allSettled([finishMatch(match._id,a._id),finishMatch(match._id,b._id)]);
  assert.equal(races.filter(result=>result.status==='fulfilled').length,1);
  const finished=await Match.findById(match._id);
  assert.equal(finished.status,'completed');
  const users=await User.find();assert.equal(users.reduce((n,u)=>n+u.wins,0),1);assert.equal(users.reduce((n,u)=>n+u.losses,0),1);
  await assert.rejects(finishMatch(match._id,b._id),e=>e.status===409);
  const expired=await Match.create({...base,endsAt:new Date(Date.now()-1000)});
  await expireMatches();await expireMatches();
  const draw=await Match.findById(expired._id);assert.equal(draw.status,'completed');assert.equal(draw.winner,null);
  assert.equal(messages.length,2);assert.deepEqual(Object.keys(messages[0]).sort(),['_id','status','winner']);
 } finally { await mongoose.disconnect();await database.stop(); }
});
