import 'dotenv/config';
import assert from 'node:assert/strict';
import { problemBank } from '../src/data/problemBank.js';
import { references, incorrect } from '../test/fixtures/problemReferences.js';
import { argumentsFor, createJudge0, outputMatches } from '../src/services/judge0.service.js';

// Two hosted executions per problem: all correct cases and hidden cases for a
// known-incorrect candidate. Batching here reduces demo API quota consumption.
const execute = createJudge0();
for (const problem of problemBank) {
  for (const wrong of [false,true]) {
    const cases = wrong ? problem.hiddenTestCases : [...problem.sampleTestCases,...problem.hiddenTestCases];
    const candidate = (wrong ? incorrect : references)[problem.title];
    const source = `const candidate = ${candidate.toString()};\nfunction solve(cases) { return cases.map(args => candidate(...args)); }`;
    const result = await execute(source, JSON.stringify([cases.map(t=>argumentsFor(t.input))]));
    assert.equal(result.verdict, 'Executed', `${problem.title}: ${result.verdict}`);
    const expected = JSON.stringify(cases.map(t=>JSON.parse(t.expectedOutput)));
    assert.equal(outputMatches(result.output, expected), !wrong, `${problem.title}: ${wrong?'incorrect':'reference'} solution`);
  }
  console.log(`Verified hosted reference and hidden-test rejection: ${problem.title}`);
}
