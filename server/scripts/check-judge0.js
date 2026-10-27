import 'dotenv/config';
import assert from 'node:assert/strict';
import { judgeCases } from '../src/services/judge0.service.js';
const samples=[{input:'[2,3]',expectedOutput:'5'}];
for (const [source,expected] of [['function solve(a,b){return a+b}', 'Accepted'],['function solve(){return 0}', 'Wrong Answer'],['function solve(){throw new Error("test runtime error")}', 'Runtime Error']]) {
 const result=await judgeCases(source,samples);
 assert.equal(result.verdict,expected);
 console.log(`${expected}: verified with hosted Judge0`);
}
