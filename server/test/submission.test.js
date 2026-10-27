import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionService, validateMatch } from '../src/services/submission.service.js';
import { judgeCases } from '../src/services/judge0.service.js';
const id = '507f1f77bcf86cd799439011';
const match = { player1: 'a', player2: 'b', status: 'in_progress', endsAt: new Date(Date.now()+60000), problem: id };
test('membership, missing, completed and expired matches are rejected', () => {
 for (const [value,user,status] of [[null,'a',404],[match,'c',403],[{...match,status:'completed'},'a',409],[{...match,endsAt:new Date(0)},'a',409]]) assert.throws(()=>validateMatch(value,user), e=>e.status===status);
});
test('hidden failures disclose only verdict, including runtime diagnostics', async () => {
 const result = await judgeCases('code',[{input:'123456',expectedOutput:'secret'}],{hidden:true,execute:async()=>({verdict:'Runtime Error',output:'123456',error:'secret'})});
 assert.deepEqual(result,{verdict:'Runtime Error'});
});
test('submission uses only database tests and rejects duplicate requests', async () => {
 let release; const pending = new Promise(resolve=>release=resolve);
 const service=createSubmissionService({getMatch:async()=>match,getProblem:async()=>({hiddenTestCases:['private']}),judge:async(code,cases,options)=>{assert.deepEqual(cases,['private']);assert.equal(options.hidden,true);await pending;return {verdict:'Wrong Answer'};}});
 const first=service('a',id,'code',true);
 await assert.rejects(service('a',id,'code',true),e=>e.status===429);
 release(); assert.deepEqual(await first,{verdict:'Wrong Answer'});
});
test('a solution finishing after the deadline cannot claim a win', async () => {
 let reads=0;let finalized=false;
 const service=createSubmissionService({getMatch:async()=>++reads===1?match:{...match,endsAt:new Date(0)},getProblem:async()=>({hiddenTestCases:['private']}),judge:async()=>({verdict:'Accepted'}),finish:async()=>{finalized=true;}});
 await assert.rejects(service('a',id,'code',true),e=>e.status===409);
 assert.equal(finalized,false);
});
