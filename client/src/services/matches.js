import { api } from './api.js'

export async function getMatch(matchId, signal) {
  const { data } = await api.get(`/matches/${encodeURIComponent(matchId)}`, { signal })
  return data.match
}

export async function judgeMatch(matchId, code, submit = false, signal) {
  const { data } = await api.post(`/matches/${encodeURIComponent(matchId)}/${submit ? 'submit' : 'run'}`, { code }, { signal, timeout: 100000 })
  return data
}

export async function getMatchResult(matchId, signal) {
  const { data } = await api.get(`/matches/${encodeURIComponent(matchId)}/result`, { signal })
  return data.match
}
export async function getHistory(signal) {
  const { data } = await api.get('/matches/history', { signal })
  return data
}
