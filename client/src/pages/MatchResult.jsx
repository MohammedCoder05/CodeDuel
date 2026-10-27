import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMatchResult } from '../services/matches'
import { errorMessage } from '../services/api'
import { socket } from '../socket/socket'
import { duration, matchDate, outcome, playAgainPath } from '../utils/history'
import MatchHeader from '../components/MatchHeader'

export default function MatchResult() {
  const { matchId } = useParams()
  return <Result key={matchId} matchId={matchId} />
}
function Result({ matchId }) {
  const { user, checkSession } = useAuth()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let pending = false
    let timer
    let resolveDelay
    const load = async () => {
      if (pending) return
      pending = true; setError(null)
      try {
        for (let retry = 0; retry < 3; retry++) {
          try {
            const data = await getMatchResult(matchId, controller.signal)
            if (controller.signal.aborted) return
            if (data.status !== 'completed') { navigate(`/duel/${encodeURIComponent(matchId)}`, { replace: true }); return }
            setMatch(data); return
          } catch (err) {
            if (controller.signal.aborted) return
            const status = err.response?.status
            if (status === 401) { checkSession(); return }
            if ([400, 403, 404].includes(status) || retry === 2) { setError({ status, message: errorMessage(err) }); return }
            await new Promise(resolve => { resolveDelay = resolve; timer = setTimeout(resolve, (retry + 1) * 1000) })
          }
        }
      } finally { pending = false }
    }
    const recover = () => {
      // The server verifies membership before rejoining; HTTP remains authoritative.
      socket.timeout(5000).emit('watch_match', matchId, () => {})
      void load()
    }
    const completed = data => { if (String(data?._id) === matchId) void load() }
    socket.on('connect', recover); socket.on('match_completed', completed)
    if (socket.connected) recover(); else { socket.connect(); void load() }
    return () => { controller.abort(); clearTimeout(timer); resolveDelay?.(); socket.off('connect', recover); socket.off('match_completed', completed) }
  }, [matchId, attempt, navigate, checkSession])

  const result = outcome(match, user._id || user.id)
  const won = result === 'win', draw = result === 'draw'
  const players = match ? [match.player1, match.player2].filter(Boolean).sort((a, b) => Number(String(b._id) === String(match.winner)) - Number(String(a._id) === String(match.winner))) : []
  const inaccessible = [400, 403, 404].includes(error?.status)
  return <div className="min-h-screen bg-[#f2f6ff] text-ink">
    <MatchHeader />
    <main className="mx-auto max-w-[1008px] px-6 py-10">
      {!match ? error ? <>
        <section className="bg-[#0e131f] p-7 text-[#f2f6ff]">
          <p className="text-[10px] font-bold tracking-[0.2em] text-red-500">{inaccessible ? 'MATCH UNAVAILABLE' : 'CONNECTION INTERRUPTED'}</p>
          <h1 className="mt-5 text-[32px] leading-tight font-bold tracking-tight">{inaccessible ? 'We couldn’t load this match.' : 'We lost the connection.'}</h1>
          <p className="mt-2 text-xs text-gray-300">{inaccessible ? error.message : 'We couldn’t recover the match status yet.'}</p>
        </section>
        <section className="mt-7 border border-[#e0e7f2] bg-white p-7">
          <h2 className="text-xl font-bold">Match result unavailable</h2>
          <p role="alert" className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">{inaccessible ? 'Return to your history to view matches you participated in.' : 'The result has not been confirmed. Your duel may still be active or already completed. Reconnect and retry to recover the server’s recorded state.'}</p>
        </section>
        {!inaccessible && <button onClick={() => { socket.connect(); setAttempt(value => value + 1) }} className="mt-7 w-full bg-ink hover:bg-slate-800 py-3 text-xs font-bold text-white">RETRY CONNECTION</button>}
        <Link to="/history" className="mt-3 block border border-gray-400 py-3 text-center text-xs font-bold">VIEW MATCH HISTORY</Link>
        <p className="mt-7 text-center text-xs text-slate-700">A connection error does not change your match result or statistics.</p>
      </> : <p role="status" className="py-24 text-center font-mono text-sm">Recovering match result…</p> : <>
        <section className="bg-[#0e131f] p-7 text-[#f2f6ff]">
          <p className={`text-[10px] font-bold tracking-[0.2em] ${won ? 'text-victory' : draw ? 'text-gray-300' : 'text-red-500'}`}>MATCH COMPLETE</p>
          <h1 className="mt-5 text-[32px] leading-tight font-bold tracking-tight">{won ? 'You got there first.' : draw ? "Time’s up. It’s a draw." : 'Your opponent got there first.'}</h1>
          <p className="mt-2 break-words text-xs font-bold tracking-widest text-gray-400 uppercase">#{match._id.slice(0, 8).toUpperCase()} / {match.problem.title}</p>
        </section>
        <section aria-label="Player results" className="mt-7 border border-[#e0e7f2] bg-white">
          {players.map((player, index) => {
            const winner = String(player._id) === String(match.winner)
            return <div key={player._id} className={`px-6 py-6 sm:px-7 sm:py-7 ${index ? `border-t-[3px] ${draw ? 'border-slate-300' : 'border-victory'}` : ''}`}>
              <h2 className="break-words text-[22px] font-bold tracking-tight">{player.username}</h2>
              <p className={`mt-2 text-[10px] font-bold tracking-[0.18em] ${draw ? 'text-slate-600' : winner ? 'text-victory' : 'text-red-600'}`}>{draw ? 'DRAW' : winner ? 'WINNER' : 'DEFEATED'}</p>
            </div>
          })}
        </section>
        <dl className="mt-7 space-y-4 border-y border-[#e0e7f2] px-5 py-6">
          {duration(match) && <div><dd className="font-bold">{duration(match)}</dd><dt className="mt-1 text-[10px] font-bold tracking-widest text-slate-600">MATCH DURATION</dt></div>}
          <div><dt className="sr-only">Mode</dt><dd className="font-bold">1V1 DUEL</dd></div>
        </dl>
        <Link to={playAgainPath} className="mt-7 block w-full rounded-[2px] bg-ink hover:bg-slate-800 py-3 text-center text-xs font-bold text-white">PLAY AGAIN</Link>
        <Link to="/history" className="mt-2 block rounded-[2px] border border-gray-400 hover:bg-white py-3 text-center text-xs font-bold">VIEW MATCH HISTORY</Link>
        <p className="mt-7 text-center text-xs text-slate-700">{matchDate(match.completedAt, true)}</p>
      </>}
    </main>
  </div>
}
