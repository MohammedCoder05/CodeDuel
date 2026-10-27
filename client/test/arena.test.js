import test from 'node:test'
import assert from 'node:assert/strict'
import { getDuelClock } from '../src/utils/duelClock.js'
import { api } from '../src/services/api.js'
import { getMatch } from '../src/services/matches.js'

test('refreshing derives time from the original server deadline', () => {
  const deadline = '2026-10-10T12:10:00Z'
  assert.equal(getDuelClock(deadline, Date.parse('2026-10-10T12:01:18Z')).text, '08:42')
  assert.equal(getDuelClock(deadline, Date.parse('2026-10-10T12:05:00Z')).text, '05:00')
})

test('the countdown reaches zero without a negative timer or an inferred outcome', () => {
  const deadline = '2026-10-10T12:10:00Z'
  assert.equal(getDuelClock(deadline, Date.parse(deadline) - 1).expired, false)
  assert.deepEqual(getDuelClock(deadline, Date.parse(deadline) + 60000), {
    text: '00:00', expired: true, hasDeadline: true,
  })
})

test('missing or invalid deadlines never create a fresh ten-minute timer', () => {
  for (const deadline of [null, undefined, '', 'invalid']) {
    assert.deepEqual(getDuelClock(deadline), { text: '--:--', expired: false, hasDeadline: false })
  }
})

test('match requests use the existing authenticated API and support cancellation', async () => {
  const originalAdapter = api.defaults.adapter
  const controller = new AbortController()
  const fixture = { _id: 'match-id', problem: { sampleTestCases: [] } }
  let calls = 0
  api.defaults.adapter = async config => {
    calls++
    assert.equal(config.baseURL, 'http://localhost:8000/api')
    assert.equal(config.url, '/matches/match-id')
    assert.equal(config.method, 'get')
    assert.equal(config.withCredentials, true)
    assert.equal(config.signal, controller.signal)
    assert.equal(config.params, undefined)
    return { data: { match: fixture }, status: 200, statusText: 'OK', headers: {}, config }
  }
  try {
    assert.deepEqual(await getMatch('match-id', controller.signal), fixture)
    controller.abort()
    await assert.rejects(getMatch('match-id', controller.signal), { code: 'ERR_CANCELED' })
    assert.equal(calls, 1)
  } finally {
    api.defaults.adapter = originalAdapter
  }
})

import { judgeMatch } from '../src/services/matches.js'
import { matchResultText } from '../src/utils/matchResult.js'
test('judging sends only source, credentials, and an extended request timeout', async () => {
  const original = api.defaults.adapter
  api.defaults.adapter = async config => {
    assert.equal(config.url, '/matches/id/submit')
    assert.deepEqual(JSON.parse(config.data), { code: 'function solve() {}' })
    assert.equal(config.withCredentials, true)
    assert.equal(config.timeout, 100000)
    return { data: { verdict: 'Accepted' }, status: 200, headers: {}, config }
  }
  try { assert.deepEqual(await judgeMatch('id','function solve() {}',true),{verdict:'Accepted'}) }
  finally { api.defaults.adapter = original }
})
test('both players get distinct outcomes from the same authoritative result', () => {
  const match={status:'completed',winner:'a'}
  assert.match(matchResultText(match,'a'),/You won/)
  assert.match(matchResultText(match,'b'),/opponent won/)
  assert.match(matchResultText({...match,winner:null},'a'),/Draw/)
  assert.equal(matchResultText({status:'in_progress'},'a'),'')
})
