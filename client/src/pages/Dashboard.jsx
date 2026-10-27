import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../services/api'
import { getHistory } from '../services/matches'
import { recentDuels, resultPath } from '../utils/history'
import LogoutButton from '../components/LogoutButton'

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    refreshUser()
    setHistoryError('')
    getHistory(controller.signal).then(data => {
      if (!controller.signal.aborted) setHistory(data)
    }).catch(err => {
      if (!controller.signal.aborted) setHistoryError(errorMessage(err))
    })
    return () => controller.abort()
  }, [refreshUser, attempt])
  const recent = recentDuels(history?.matches ?? [], user._id || user.id)
  const date = new Date()
  const day = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-4 bg-ink px-5 py-3 text-paper">
        <Link to="/dashboard" className="font-bold tracking-tight">CodeDuel</Link>
        <nav aria-label="Main navigation" className="flex gap-7 font-mono text-xs font-bold tracking-widest">
          <Link to="/dashboard" aria-current="page">PLAY</Link>
          <Link to="/history">HISTORY</Link>
        </nav>
        <div className="flex max-w-full items-center gap-4 text-xs">
          <span className="max-w-40 truncate border border-gray-600 px-3 py-2 font-mono" title={user.username}>{user.username}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-[1024px] px-6 py-11">
        <p className="font-mono text-xs font-bold tracking-widest text-slate-600 uppercase">{day} / {monthDay}</p>
        <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight sm:text-[56px] sm:tracking-[-0.04em]">Ready when you are.</h1>
        <p className="mt-3 text-slate-600">Ten minutes. One problem. No spectators.</p>
        <Link to="/play" className="mt-6 inline-flex items-center gap-7 bg-ink hover:bg-slate-800 px-6 py-4 font-sans text-sm font-bold tracking-wide text-paper">FIND MATCH <span className="h-3.5 w-3.5 bg-victory" aria-hidden="true" /></Link>

        <section aria-label="Your statistics" className="mt-9 bg-ink p-6 text-paper">
          <h2 className="break-words font-mono text-sm font-bold tracking-wider uppercase">{user.username}</h2>
          <dl className="mt-7 grid grid-cols-3 gap-3">
            {[['Wins', user.wins], ['Losses', user.losses], ['Total duels', history?.stats.total ?? '—']].map(([label, value], index) => (
              <div key={label} className={index === 1 ? 'text-center' : index === 2 ? 'text-right' : ''}>
                <dt className="font-mono text-[10px] tracking-wider text-gray-400 uppercase sm:text-xs">{label}</dt>
                <dd className={`mt-2 font-mono tabular-nums text-2xl font-semibold sm:text-4xl ${index === 2 ? 'text-victory' : ''}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-11" aria-labelledby="recent-duels">
          <h2 id="recent-duels" className="mb-4 font-mono text-sm font-bold tracking-wider">RECENT DUELS</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-line font-mono text-[11px] tracking-wider text-slate-600 uppercase">
                <tr>{['Opponent', 'Problem', 'Result', 'Time'].map(label => <th key={label} scope="col" className="px-2 py-3 first:pl-0">{label}</th>)}</tr>
              </thead>
              <tbody>
                {historyError ? <tr><td colSpan={4} className="border-b border-line py-10 text-center text-slate-600"><p role="alert">{historyError}</p><button onClick={() => setAttempt(value => value + 1)} className="mt-3 text-xs font-semibold underline underline-offset-4">TRY AGAIN</button></td></tr>
                  : !history ? <tr><td colSpan={4} className="border-b border-line py-10 text-center text-slate-600"><p role="status">Loading recent duels…</p></td></tr>
                  : recent.length ? recent.map(match => <tr key={match.id} className="border-b border-line">
                    <td className="py-5 pr-2 font-semibold">{match.opponent}</td>
                    <td className="px-2 py-5"><Link to={resultPath(match.id)} className="hover:underline underline-offset-4">{match.problem}</Link></td>
                    <td className={`px-2 py-5 font-semibold ${match.result === 'win' ? 'text-victory' : match.result === 'loss' ? 'text-red-600' : 'text-slate-600'}`}>{match.result.toUpperCase()}</td>
                    <td className="px-2 py-5 font-mono text-xs text-slate-600">{match.time ?? '—'}</td>
                  </tr>)
                  : <tr><td colSpan={4} className="border-b border-line py-10 text-center text-slate-600"><p className="mb-2 text-sm">Every duel is a chance to improve.</p><Link to="/history" className="inline-block px-3 py-2 text-xs font-semibold underline underline-offset-4 hover:text-ink">View your match history</Link></td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="mt-11" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="mb-4 font-mono text-sm font-bold tracking-wider">HOW IT WORKS</h2>
          <ol>{['Queue', 'Solve', 'Win'].map((step, index) => <li key={step} className="flex items-center gap-4 border-t border-line px-4 py-5 last:border-b"><span className="text-2xl font-bold text-victory">0{index + 1}</span><span className="font-mono text-sm font-bold tracking-wider uppercase">{step}</span></li>)}</ol>
        </section>
      </main>
    </div>
  )
}
