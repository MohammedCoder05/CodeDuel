import test from 'node:test';
import assert from 'node:assert/strict';
import { argumentsFor, buildHarness, createJudge0, judgeCases } from '../src/services/judge0.service.js';

test('function harness uses stdin arguments, preserves legacy input, and excludes answers', () => {
    assert.deepEqual(argumentsFor('2 3'), [2, 3]);
    assert.deepEqual(argumentsFor('[[1,2],3]'), [[1,2],3]);
    assert.throws(() => argumentsFor('nums = [1,2]'), /Problem input/);
    assert.match(buildHarness('function solve(a,b){ return a+b }'), /await solve\(\.\.\.args\)/);
});

test('Judge0 transport polls, enforces limits, and never sends expected outputs', async () => {
    const calls = [];
    const execute = createJudge0({ env: { JUDGE0_API_URL: 'https://judge.example', JUDGE0_API_KEY: 'test-secret' }, pause: async () => {}, fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => calls.length === 1 ? { token: 'abc' } : calls.length === 2 ? { status: { id: 2 } } : { status: { id: 3 }, stdout: Buffer.from('5').toString('base64') } };
    } });
    const result = await execute('function solve(a,b){return a+b}', '2 3');
    assert.equal(result.output, '5');
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.enable_network, false);
    assert.equal(body.cpu_time_limit, 2);
    assert.equal(body.expected_output, undefined);
    assert.equal(calls[0].options.headers['X-Auth-Token'], 'test-secret');
    assert.equal(calls.length, 3);
});

test('correct, incorrect and runtime-error provider results yield useful sample verdicts', async () => {
    const cases = [{ input: '2 3', expectedOutput: '5' }];
    for (const [output, expected] of [['5', 'Accepted'], ['4', 'Wrong Answer']]) {
        const result = await judgeCases('source', cases, { execute: async () => ({ verdict: 'Executed', output }) });
        assert.equal(result.verdict, expected);
        assert.equal(result.results[0].output, output);
    }
    const result = await judgeCases('source', cases, { execute: async () => ({ verdict: 'Runtime Error', error: 'solve is not defined' }) });
    assert.equal(result.verdict, 'Runtime Error');
    assert.equal(result.results[0].error, 'solve is not defined');
});

test('provider quota errors fail safely without exposing credentials', async () => {
    const execute = createJudge0({ env: { JUDGE0_API_URL: 'https://judge.example' }, fetchImpl: async () => ({ ok: false, status: 429 }) });
    await assert.rejects(execute('source', '1 2'), /quota/);
});
