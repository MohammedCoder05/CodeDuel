import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createMatchmaking, searchElapsed } from '../src/socket/matchmaking.js'

function setup() {
  const events = new EventEmitter()
  const requests = []
  const destinations = []
  let now = 1000
  const socket = { connected: true, on: events.on.bind(events), off: events.off.bind(events), emit: (...args) => requests.push(args) }
  const queue = createMatchmaking(socket, () => now)
  const attach = () => queue.attach(id => destinations.push(id))
  return { events, socket, queue, requests, destinations, attach, setTime: value => { now = value } }
}

test('Strict Mode setup/cleanup/setup neither emits nor duplicates listeners', () => {
  const { queue, events, requests, attach } = setup()
  attach()()
  const detach = attach()
  for (const event of ['connect', 'disconnect', 'connect_error', 'match_searching', 'match_found', 'match_error']) assert.equal(events.listenerCount(event), 1)
  assert.deepEqual(requests, [])
  assert.equal(queue.start(), true)
  assert.equal(queue.start(), false)
  events.emit('match_searching', { message: 'Waiting for an opponent...' })
  assert.equal(queue.start(), false)
  assert.deepEqual(requests, [['find_match']])
  detach()
  assert.equal(events.eventNames().length, 0)
})

test('both players receive the same destination; duplicate events cannot navigate twice', () => {
  const players = [setup(), setup()]
  for (const player of players) {
    player.attach()
    player.queue.start()
    player.events.emit('match_found', { matchId: 'shared-match', message: 'Opponent found!' })
    player.events.emit('match_found', { matchId: 'shared-match' })
    assert.deepEqual(player.destinations, ['shared-match'])
    assert.equal(player.queue.getSnapshot().phase, 'matched')
  }
})

test('disconnect stops searching; reconnection does not silently requeue', () => {
  const { socket, queue, events, requests, attach, setTime } = setup()
  attach()
  queue.start()
  setTime(19000)
  socket.connected = false
  events.emit('disconnect')
  assert.equal(queue.getSnapshot().phase, 'interrupted')
  assert.equal(searchElapsed(queue.getSnapshot(), 50000), '00:18')
  assert.equal(queue.start(), false)
  socket.connected = true
  events.emit('connect')
  assert.equal(requests.length, 1)
  assert.equal(queue.start(), true)
  assert.equal(requests.length, 2)
  assert.equal(searchElapsed(queue.getSnapshot(), 19000), '00:00')
})

test('errors permit one explicit retry and malformed matches never navigate', () => {
  const { queue, events, destinations, requests, attach } = setup()
  attach()
  queue.start()
  events.emit('match_error', { message: 'No problems available.' })
  assert.equal(queue.getSnapshot().phase, 'error')
  assert.equal(queue.getSnapshot().message, 'No problems available.')
  queue.start()
  queue.start()
  assert.equal(requests.length, 2)
  events.emit('match_found', { message: 'Missing match ID' })
  assert.equal(queue.getSnapshot().phase, 'error')
  assert.deepEqual(destinations, [])
})

test('elapsed timer uses search time, not a duel duration, and stops on match_found', () => {
  const { queue, events, attach, setTime } = setup()
  attach()
  queue.start()
  assert.equal(searchElapsed(queue.getSnapshot(), 62000), '01:01')
  setTime(67000)
  events.emit('match_found', { matchId: 'match' })
  assert.equal(searchElapsed(queue.getSnapshot(), 999999), '01:06')
})

test('no request is buffered without a connection or before listeners attach', () => {
  const { queue, socket, attach, requests } = setup()
  assert.equal(queue.start(), false)
  socket.connected = false
  attach()
  assert.equal(queue.start(), false)
  assert.deepEqual(requests, [])
})

test('failed reconnect attempts keep the interrupted search timer frozen', () => {
  const { queue, socket, events, attach, setTime } = setup()
  attach()
  queue.start()
  setTime(19000)
  socket.connected = false
  events.emit('disconnect')
  setTime(70000)
  events.emit('connect_error', new Error('Server unavailable'))
  assert.equal(searchElapsed(queue.getSnapshot(), 90000), '00:18')
  assert.equal(queue.getSnapshot().phase, 'interrupted')
})
