import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMatchmaking } from '../components/SocketLayout'
import { socket } from '../socket/socket'
import { searchElapsed } from '../socket/matchmaking'

export default function Play() {
  const { user } = useAuth()
  const queue = useMatchmaking()
  const searching = queue.phase === 'searching'
  const showQueue = ['searching', 'error', 'interrupted'].includes(queue.phase)

  return <div className="min-h-screen bg-[#f2f6ff] text-ink">
    <header className="flex h-14 items-center justify-between bg-ink px-4 text-[#f2f6ff]">
      {searching ? <span className="text-sm font-bold tracking-tight">CodeDuel</span> : <Link to="/dashboard" className="text-sm font-bold tracking-tight">CodeDuel</Link>}
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex max-w-[45vw] sm:max-w-52 items-center gap-2 border border-slate-500 px-3 py-2 text-xs">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${searching ? 'bg-violet-500' : 'bg-[#b9ee36]'}`} />
          <span className="truncate">{user.username}</span>
        </span>
        {searching ? <button disabled aria-label="Navigation unavailable while queued" className="cursor-not-allowed text-slate-400"><Menu size={17} /></button> : <details className="relative">
          <summary aria-label="Navigation" className="flex min-h-11 min-w-11 items-center justify-center cursor-pointer list-none [&::-webkit-details-marker]:hidden"><Menu size={17} /></summary>
          <Link to="/dashboard" className="absolute right-0 top-8 z-10 border border-slate-500 bg-ink hover:bg-slate-800 px-5 py-3 text-xs">Dashboard</Link>
        </details>}
      </div>
    </header>
    {showQueue ? <Searching queue={queue} /> : <main className="mx-auto max-w-[852px] px-6 py-10">
      <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-slate-600">PLAY / QUEUE</p>
      <h1 className="mt-3 text-[32px] leading-tight font-bold tracking-tight">Pick your duel.</h1>
      <p className="mt-3 text-sm text-slate-700">Same problem. Same clock. First accepted solution wins.</p>
      <label className="mt-7 flex cursor-pointer items-center gap-3 border border-[#e0e7f2] bg-white px-3 py-4">
        <input type="radio" name="mode" value="1v1" defaultChecked className="h-4 w-4 shrink-0 appearance-none border border-[#c9d4eb] checked:bg-violet-600 checked:shadow-[inset_0_0_0_4px_white]" />
        <span><span className="block font-mono text-xs font-bold">1V1 DUEL</span><span className="mt-1 block text-xs text-slate-700">10 min · same problem · first accepted solution wins</span></span>
      </label>
      <p role="status" className="mt-6 font-mono text-[10px] text-slate-700">{queue.connected ? 'Ready to find your opponent.' : queue.message || 'Connecting to the matchmaking server…'}</p>
      <button onClick={queue.start} disabled={!queue.connected} className="mt-3 min-h-11 w-full rounded-[2px] bg-ink hover:bg-slate-800 px-4 py-2.5 font-sans text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">START MATCHMAKING</button>
      {!queue.connected && <button onClick={() => socket.connect()} className="mt-3 mr-5 font-mono text-[10px] underline underline-offset-4">RECONNECT</button>}
      <Link to="/dashboard" className="mt-4 block w-fit font-mono text-[10px] text-slate-700 underline underline-offset-4">CANCEL</Link>
      <section className="mt-10 rounded-[2px] bg-ink p-5 text-white" aria-labelledby="duel-rules">
        <h2 id="duel-rules" className="font-mono text-[10px] font-bold tracking-[0.16em] text-gray-400">DUEL RULES</h2>
        <p className="mt-5 font-mono text-[44px] leading-tight font-bold tracking-tight text-[#b9ee36]">10:00</p>
        <ul className="mt-6 space-y-3 border-t border-slate-500 pt-4 text-xs"><li>Same problem</li><li>First accepted solution wins</li><li>Draw on timeout</li></ul>
      </section>
    </main>}
  </div>
}

function Searching({ queue }) {
  const [now, setNow] = useState(Date.now)
  const searching = queue.phase === 'searching'
  useEffect(() => {
    if (!searching) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [searching, queue.startedAt])

  return <main className="mx-auto flex min-h-[calc(100svh-56px)] max-w-[798px] flex-col justify-center px-6 py-12">
    <section className="rounded-[3px] bg-ink p-6 text-[#f2f6ff] sm:p-7" aria-labelledby="queue-heading">
      <div className="flex items-center justify-between gap-3 font-mono text-xs font-bold tracking-wider">
        <p className="flex items-center gap-3"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 ${searching ? 'bg-victory motion-safe:animate-pulse' : 'bg-amber-400'}`} />{searching ? 'SEARCHING THE QUEUE' : queue.connected ? 'SEARCH INTERRUPTED' : 'CONNECTION LOST'}</p>
        <span role="timer" aria-label="Elapsed search time" className="shrink-0 tabular-nums">{searchElapsed(queue, now)}</span>
      </div>
      <h1 id="queue-heading" className="mt-7 text-[26px] leading-tight font-bold tracking-tight">{searching ? 'Looking for a fair fight.' : 'Let’s try that again.'}</h1>
      <p className="mt-2 text-xs text-gray-300">{searching ? 'Matchmaking you with another player.' : 'Your search is no longer active.'}</p>
      <ol aria-label="Matchmaking progress" className="relative mt-7 flex items-center justify-between before:absolute before:inset-x-0 before:top-1/2 before:h-[3px] before:bg-victory">
        {['YOU', 'MATCH', 'ARENA'].map((step, index) => <li key={step} aria-current={index === 0 ? 'step' : undefined} className={`relative flex h-12 w-12 items-center justify-center rounded-full border text-[10px] font-bold ${index === 0 ? 'border-victory bg-victory text-black' : 'border-gray-300 bg-ink text-white'}`}>{step}</li>)}
      </ol>
      <div className="mt-7 border-t border-slate-500 pt-5">
        <p className="font-mono text-[10px] tracking-wider text-gray-400">{searching ? 'QUEUE STATUS' : 'SEARCH STATUS'}</p>
        <p role={searching ? 'status' : 'alert'} className="mt-2 text-sm leading-relaxed">{queue.message}</p>
      </div>
    </section>
    <div className="mt-5 text-center">
      {searching ? <>
        <button disabled aria-describedby="leave-queue-note" className="cursor-not-allowed rounded-[3px] border border-[#dfe7f4] px-7 py-2.5 font-sans text-[11px] font-bold tracking-widest">LEAVE QUEUE</button>
        <p id="leave-queue-note" className="mt-3 text-[10px] text-slate-700">Queue cancellation is not available yet.</p>
      </> : <>
        <button onClick={queue.connected ? queue.start : () => socket.connect()} className="bg-ink hover:bg-slate-800 px-7 py-3 font-sans text-xs font-bold text-white">{queue.connected ? 'RETRY MATCHMAKING' : 'RECONNECT'}</button>
        <Link to="/dashboard" className="mt-4 block font-mono text-[10px] underline underline-offset-4">BACK TO DASHBOARD</Link>
      </>}
    </div>
  </main>
}
