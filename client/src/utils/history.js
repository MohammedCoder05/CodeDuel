export const resultPath = id => `/matches/${encodeURIComponent(id)}/result`
export const playAgainPath = '/play'
export function outcome(match, userId) {
  if (match?.status !== 'completed') return null
  if (!match.winner) return 'draw'
  return String(match.winner._id || match.winner) === String(userId) ? 'win' : 'loss'
}
export function filterHistory(matches, filter, userId) {
  return matches.filter(match => filter === 'all' || outcome(match, userId) === filter)
}
export function duration(match) {
  if (!match.startedAt || !match.completedAt) return null
  const start = Date.parse(match.startedAt)
  const recordedEnd = Date.parse(match.completedAt)
  const deadline = Date.parse(match.endsAt)
  // A restart can record a timeout long after play actually ended.
  const end = Number.isFinite(deadline) ? Math.min(recordedEnd, deadline) : recordedEnd
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  const seconds = Math.floor((end - start) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
export const matchDate = (value, full = false) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(full ? { year: 'numeric' } : {}) }) : 'Date unavailable'

// History API supplies completed matches newest-first (including draws).
export function recentDuels(matches, userId) {
  return matches.filter(match => match.status === 'completed').slice(0, 5).map(match => ({
    id: match._id,
    opponent: (String(match.player1?._id) === String(userId) ? match.player2 : match.player1)?.username || 'Deleted player',
    problem: match.problem?.title || 'Deleted problem',
    result: outcome(match, userId),
    time: duration(match),
  }))
}
