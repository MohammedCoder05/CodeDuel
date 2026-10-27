import test from 'node:test'
import assert from 'node:assert/strict'
import { recentDuels } from '../src/utils/history.js'
import { getHistory } from '../src/services/matches.js'
import { api } from '../src/services/api.js'

test('dashboard uses history response: latest five of eight completed matches include losses and draws', async () => {
  const viewer = { _id: 'viewer', username: 'mohammed.dev' }
  const opponent = { _id: 'opponent', username: 'alex.dev' }
  const matches = Array.from({ length: 8 }, (_, index) => ({
    _id: `match-${index}`, status: 'completed', winner: index < 2 ? opponent._id : null,
    player1: index % 2 ? opponent : viewer, player2: index % 2 ? viewer : opponent,
    problem: { title: `Problem ${index}` },
    startedAt: `2026-10-${26 - index}T10:00:00Z`,
    endsAt: `2026-10-${26 - index}T10:10:00Z`,
    completedAt: `2026-10-${26 - index}T10:${index < 2 ? '04:18' : '10:00'}Z`,
  }))
  const response = { matches, stats: { total: 8, wins: 0, losses: 2, draws: 6, winRate: 0 } }
  const original = api.defaults.adapter
  api.defaults.adapter = async config => {
    assert.equal(config.url, '/matches/history')
    assert.equal(config.withCredentials, true)
    return { data: response, status: 200, headers: {}, config }
  }
  try {
    const data = await getHistory()
    const before = JSON.stringify(data)
    const rows = recentDuels(data.matches, viewer._id)
    assert.equal(data.stats.total, 8)
    assert.deepEqual(rows, matches.slice(0, 5).map((match, index) => ({
      id: match._id, opponent: 'alex.dev', problem: `Problem ${index}`,
      result: index < 2 ? 'loss' : 'draw', time: index < 2 ? '04:18' : '10:00',
    })))
    assert.deepEqual(recentDuels(data.matches, opponent._id).map(row => row.result), ['win', 'win', 'draw', 'draw', 'draw'])
    assert.equal(JSON.stringify(data), before, 'does not mutate history or statistics')
  } finally { api.defaults.adapter = original }
})

test('recent duels excludes unfinished matches and tolerates deleted references and missing timestamps', () => {
  assert.deepEqual(recentDuels([], 'viewer'), [])
  assert.deepEqual(recentDuels([
    { _id: 'active', status: 'in_progress' },
    { _id: 'draw', status: 'completed', winner: null, player1: { _id: 'viewer' }, player2: null, problem: null },
  ], 'viewer'), [{ id: 'draw', opponent: 'Deleted player', problem: 'Deleted problem', result: 'draw', time: null }])
})
