import { setTimeout as sleep } from 'node:timers/promises';

export class JudgeError extends Error {
    constructor(message, status = 503) { super(message); this.status = status; }
}

export function argumentsFor(input) {
    if (typeof input !== 'string' || input.length > 16384) throw new JudgeError('Invalid problem input.', 422);
    try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
    } catch {
        const tokens = input.trim().split(/\s+/);
        if (tokens.every(token => /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token) && Number.isFinite(Number(token)))) {
            return tokens.map(Number);
        }
        throw new JudgeError('Problem input must be a JSON argument array or space-separated numbers.', 422);
    }
}

// This string is sent to Judge0. It is never evaluated by the application server.
export function buildHarness(code) {
    return `${code}\n;\n(async () => {\n  const args = JSON.parse(require('fs').readFileSync(0, 'utf8'));\n  const result = await solve(...args);\n  if (result === undefined) throw new Error('solve must return a value');\n  process.stdout.write(typeof result === 'string' ? result : JSON.stringify(result));\n})().catch(error => { console.error(error && error.message || 'Runtime error'); process.exitCode = 1; });\n`;
}

export function outputMatches(actual, expected) {
    const normalize = value => String(value).replace(/\r\n/g, '\n').trim();
    try {
        // Structured outputs use JSON comparison, including object key order independence.
        const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
            ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
        const expectedValue = JSON.parse(expected);
        // New bank string answers are JSON-encoded, including empty/whitespace strings.
        // The existing harness writes returned strings verbatim.
        if (typeof expectedValue === 'string') return String(actual) === expectedValue;
        return JSON.stringify(canonical(JSON.parse(actual))) === JSON.stringify(canonical(expectedValue));
    } catch { return normalize(actual) === normalize(expected); }
}

const decode = value => value ? Buffer.from(value, 'base64').toString('utf8').slice(0, 16385) : '';

export function createJudge0({ env = process.env, fetchImpl = fetch, pause = sleep } = {}) {
    return async function execute(code, input, signal) {
        const base = env.JUDGE0_API_URL?.replace(/\/$/, '');
        const language = Number(env.JUDGE0_JAVASCRIPT_LANGUAGE_ID || 63);
        if (!base || !Number.isInteger(language) || language < 1) throw new JudgeError('Judge0 is not configured. Contact the demo administrator.');
        const url = new URL(base);
        if (url.protocol !== 'https:') throw new JudgeError('The hosted Judge0 URL must use HTTPS.');
        const headers = { 'Content-Type': 'application/json' };
        if (env.JUDGE0_API_HOST) {
            headers['X-RapidAPI-Host'] = env.JUDGE0_API_HOST;
            if (env.JUDGE0_API_KEY) headers['X-RapidAPI-Key'] = env.JUDGE0_API_KEY;
        } else if (env.JUDGE0_API_KEY) headers['X-Auth-Token'] = env.JUDGE0_API_KEY;
        const deadline = Date.now() + 30000;
        async function request(path, options = {}) {
            const remaining = deadline - Date.now();
            if (remaining <= 0) throw new JudgeError('Judge0 did not finish in time. Please retry.');
            try {
                const timeout = AbortSignal.timeout(Math.min(remaining, 8000));
                const response = await fetchImpl(`${base}${path}`, { ...options, headers, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
                if (!response.ok) throw new JudgeError(response.status === 429 ? 'Judge0 quota exceeded. Please try later.' : 'Judge0 request failed. Check the server configuration.');
                return await response.json();
            } catch (error) {
                if (error instanceof JudgeError) throw error;
                throw new JudgeError('Judge0 is unavailable or timed out. Please retry.');
            }
        }
        const submission = await request('/submissions?base64_encoded=true&wait=false', {
            method: 'POST',
            body: JSON.stringify({
                language_id: language,
                source_code: Buffer.from(buildHarness(code)).toString('base64'),
                stdin: Buffer.from(JSON.stringify(argumentsFor(input))).toString('base64'),
                cpu_time_limit: 2, cpu_extra_time: 0.5, wall_time_limit: 5,
                memory_limit: 256000, stack_limit: 64000, max_file_size: 16,
                max_processes_and_or_threads: 64, enable_network: false, number_of_runs: 1,
            }),
        });
        if (!submission.token || typeof submission.token !== 'string') throw new JudgeError('Judge0 returned an invalid submission token.');
        for (let attempt = 0; attempt < 45; attempt++) {
            await pause(500, undefined, { signal });
            const result = await request(`/submissions/${encodeURIComponent(submission.token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`);
            const status = result.status?.id;
            if (status === 1 || status === 2) continue;
            if (status === 13 || !Number.isInteger(status)) throw new JudgeError('Judge0 could not judge this request. Please retry.');
            const verdict = decode(result.stdout).length > 8192 ? 'Output Limit Exceeded' : status === 3 ? 'Executed' : status === 5 ? 'Time Limit Exceeded' : status === 6 ? 'Compilation Error' : 'Runtime Error';
            return { verdict, output: decode(result.stdout), error: (decode(result.stderr) || decode(result.compile_output)).slice(0, 8192), time: result.time, memory: result.memory };
        }
        throw new JudgeError('Judge0 did not finish in time. Please retry.');
    };
}

export async function judgeCases(code, cases, { hidden = false, execute = createJudge0() } = {}) {
    if (typeof code !== 'string' || !code.trim() || Buffer.byteLength(code) > 65536) throw new JudgeError('Provide JavaScript source code up to 64 KB.', 400);
    if (!Array.isArray(cases) || cases.length === 0 || cases.length > 20) throw new JudgeError('The problem must have between 1 and 20 tests per suite.', 422);
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]);
    const results = new Array(cases.length);
    let cursor = 0;
    async function worker() {
        while (cursor < cases.length) {
            const index = cursor++;
            const testCase = cases[index];
            if (typeof testCase.input !== 'string' || typeof testCase.expectedOutput !== 'string' || testCase.input.length > 16384 || testCase.expectedOutput.length > 8192) throw new JudgeError('Invalid problem test configuration.', 422);
            const result = await execute(code, testCase.input, signal);
            const verdict = result.verdict === 'Executed' ? (outputMatches(result.output, testCase.expectedOutput) ? 'Accepted' : 'Wrong Answer') : result.verdict;
            results[index] = { verdict, output: result.output, error: result.error, expectedOutput: testCase.expectedOutput, input: testCase.input };
        }
    }
    try { await Promise.all([worker(), worker()]); }
    catch (error) { controller.abort(); throw error; }
    const verdict = results.find(result => result.verdict !== 'Accepted')?.verdict || 'Accepted';
    // No hidden-case output, error, index, timing, input, or expected output leaves this boundary.
    return hidden ? { verdict } : { verdict, results };
}
