import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MatchHeader from '../components/MatchHeader'
import { getHistory } from '../services/matches'
import { errorMessage } from '../services/api'
import { duration, filterHistory, matchDate, outcome, resultPath } from '../utils/history'

export default function History() {
  const { user, checkSession } = useAuth()
  const userId = String(user._id || user.id)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    getHistory(controller.signal).then(setData).catch(err => {
      if (controller.signal.aborted) return
      if (err.response?.status === 401) checkSession(); else setError(errorMessage(err))
    })
    return () => controller.abort()
  }, [attempt, checkSession])
  const matches = data ? filterHistory(data.matches, filter, userId) : []
  return <div className="min-h-screen bg-[#faf7ef] text-ink">
    <MatchHeader history />
    <main className="mx-auto max-w-[1008px] px-6 py-10">
      <p className="font-mono text-[10px] tracking-[0.18em] text-slate-700">PROFILE / PERFORMANCE</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight">Your duels.</h1>
        <select aria-label="Filter match results" value={filter} onChange={event => setFilter(event.target.value)} className="min-h-11 min-w-36 border border-gray-400 bg-transparent hover:bg-white px-3 py-2 font-mono text-[10px] tracking-wider uppercase">
          <option value="all">All Results</option><option value="win">Wins</option><option value="loss">Losses</option><option value="draw">Draws</option>
        </select>
      </div>
      {error ? <div role="alert" className="mt-7 border border-line p-6"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)} className="mt-4 text-xs font-bold underline">TRY AGAIN</button></div> : !data ? <p role="status" className="py-16 text-center font-mono text-sm">Loading your duels…</p> : <>
        <dl className="mt-7 grid grid-cols-2 divide-x divide-gray-700 bg-[#0e131f] text-[#f2f6ff] sm:grid-cols-4">
          {[['MATCHES', data.stats.total], ['WINS', data.stats.wins], ['LOSSES', data.stats.losses], ['WIN RATE', `${data.stats.winRate.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="px-5 py-4"><dt className="text-[10px] tracking-widest text-gray-400">{label}</dt><dd className="mt-1 font-mono tabular-nums text-[22px] font-semibold">{value}</dd></div>)}
        </dl>
        <section aria-label="Match history" className="mt-7 border border-gray-400">
          {matches.length ? <ul className="divide-y divide-gray-400">{matches.map(match => {
            const result = outcome(match, userId)
            const opponent = String(match.player1?._id) === userId ? match.player2 : match.player1
            return <li key={match._id}><Link to={resultPath(match._id)} className="block px-4 py-4 hover:bg-white/60 focus-visible:bg-white">
              <div className="flex items-center justify-between gap-4"><span className={`px-2 py-1 font-mono font-semibold text-[10px] uppercase ${result === 'win' ? 'bg-[#d8faa2] text-[#244500]' : result === 'loss' ? 'bg-[#ffc9cc] text-red-900' : 'bg-slate-200 text-slate-700'}`}>{result}</span><time dateTime={match.completedAt || undefined} className="font-mono text-xs">{matchDate(match.completedAt)}</time></div>
              <p className="mt-3 break-words text-xs"><span className="font-bold">{opponent?.username || 'Deleted player'}</span><span className="text-slate-700"> / {match.problem.title}</span>{duration(match) && <span className="font-mono"> / {duration(match)}</span>}</p>
            </Link></li>
          })}</ul> : <div className="px-6 py-14 text-center"><h2 className="text-lg font-bold">{data.stats.total ? 'No duels match this filter.' : 'Your first duel awaits.'}</h2><p className="mt-2 text-sm text-slate-600">{data.stats.total ? 'Choose another result to see your matches.' : 'Completed matches will appear here.'}</p>{!data.stats.total && <Link to="/play" className="mt-5 inline-block bg-ink hover:bg-slate-800 px-6 py-3 text-xs font-bold text-white">PICK YOUR DUEL</Link>}</div>}
        </section>
      </>}
    </main>
  </div>
}
