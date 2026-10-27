import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Problem from '../src/models/problem.model.js';
import Match from '../src/models/match.model.js';
import { problemBank } from '../src/data/problemBank.js';
import { references, incorrect } from './fixtures/problemReferences.js';
import { seedProblems } from '../src/services/problemSeed.service.js';
import { argumentsFor, outputMatches } from '../src/services/judge0.service.js';
const stdout = value => typeof value === 'string' ? value : JSON.stringify(value);

test('all eight banks: valid documents, reference outputs, meaningful hidden rejection', async () => {
  assert.equal(problemBank.length,8);assert.equal(new Set(problemBank.map(p=>p.title)).size,8);
  for (const problem of problemBank) {
    await new Problem(problem).validate();
    assert.ok(problem.sampleTestCases.length>=2);assert.ok(problem.hiddenTestCases.length>=5);
    for (const sample of [...problem.sampleTestCases,...problem.hiddenTestCases]) {
      const args=argumentsFor(sample.input);assert.ok(Array.isArray(args));
      assert.ok(outputMatches(stdout(references[problem.title](...args)),sample.expectedOutput),problem.title);
    }
    assert.ok(problem.hiddenTestCases.some(sample=>!outputMatches(stdout(incorrect[problem.title](...argumentsFor(sample.input))),sample.expectedOutput)),problem.title);
  }
});

test('JSON strings preserve empty/whitespace answers; arrays and numbers compare structurally; legacy inputs remain supported', () => {
 assert.deepEqual(argumentsFor('[[2,7],9]'),[[2,7],9]);assert.deepEqual(argumentsFor('["hello","world"]'),['hello','world']);assert.deepEqual(argumentsFor('2 3'),[2,3]);
 assert.throws(()=>argumentsFor(undefined));assert.throws(()=>argumentsFor('not valid JSON'));assert.throws(()=>argumentsFor('x'.repeat(16385)));
 for (const [actual,expected] of [['','""'],[' a ','" a "'],['hello','"hello"'],['123','"123"'],['[0, 1]','[0,1]'],['5.0','5'],['hello','hello']]) assert.ok(outputMatches(actual,expected));
 assert.equal(outputMatches('a','" a "'),false);assert.equal(outputMatches('[1,0]','[0,1]'),false);assert.equal(outputMatches('false','true'),false);
});

test('repeat and concurrent seed runs preserve active/old problem documents, IDs and history', async () => {
 const database=await MongoMemoryReplSet.create({replSet:{count:1}});
 try {
  await mongoose.connect(database.getUri());
  const original=await Problem.create({...problemBank[0],description:'Legacy description',sampleTestCases:[{input:'2 3',expectedOutput:'5'}]});
  const active=await Match.create({player1:new mongoose.Types.ObjectId(),player2:new mongoose.Types.ObjectId(),problem:original._id,status:'in_progress',endsAt:new Date(Date.now()+600000)});
  const before=await Problem.findById(original._id).select('+hiddenTestCases').lean();
  await Promise.all([seedProblems(),seedProblems()]);await seedProblems();
  assert.equal(await Problem.countDocuments(),8);
  assert.deepEqual(await Problem.findById(original._id).select('+hiddenTestCases').lean(),before);
  assert.equal(String((await Match.findById(active._id)).problem),String(original._id));
  assert.equal(JSON.stringify(await Problem.find().lean()).includes('hiddenTestCases'),false);
 } finally {await mongoose.disconnect();await database.stop();}
});
