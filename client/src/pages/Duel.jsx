import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, GripHorizontal, CheckCircle2, XCircle, LoaderCircle } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMatch, judgeMatch } from '../services/matches'
import { errorMessage } from '../services/api'
import { socket } from '../socket/socket'
import { matchResultText } from '../utils/matchResult'
import CodeEditor from '../components/CodeEditor'
import { resultPath } from '../utils/history'
import { getDuelClock } from '../utils/duelClock'

export default function Duel() {
  const { matchId } = useParams()
  return <Arena key={matchId} matchId={matchId} />
}

function Arena({ matchId }) {
  const { user, checkSession } = useAuth()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [code, setCode] = useState('')
  const [expanded, setExpanded] = useState(true)
  const [now, setNow] = useState(Date.now)
  const [editorHeight, setEditorHeight] = useState(320)
  const [judging, setJudging] = useState('')
  const [result, setResult] = useState(null)
  const [judgeError, setJudgeError] = useState('')
  const [connection, setConnection] = useState(socket.connected)
  const [syncError, setSyncError] = useState('')
  const judgingRequest = useRef(null)

  useEffect(() => () => judgingRequest.current?.abort(), [])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const update = data => {
      if (!alive || String(data?._id) !== matchId) return
      setMatch(current => current ? { ...current, status: data.status, winner: data.winner } : current)
    }
    const watch = () => {
      setConnection(true)
      socket.timeout(5000).emit('watch_match', matchId, (err, response) => {
        if (!alive) return
        if (err || response?.error) setSyncError('Live updates unavailable. Checking match status periodically.')
        else { setSyncError(''); update(response.match) }
      })
    }
    const disconnected = () => setConnection(false)
    const refresh = async () => {
      try { const data = await getMatch(matchId, controller.signal); update(data); if (alive) setSyncError('') }
      catch (err) { if (alive && err.code !== 'ERR_CANCELED') setSyncError('Unable to refresh match status. Reconnecting…') }
    }
    socket.on('match_completed', update)
    socket.on('connect', watch)
    socket.on('disconnect', disconnected)
    if (socket.connected) watch()
    const interval = setInterval(refresh, 3000)
    window.addEventListener('focus', refresh)
    return () => {
      alive = false; controller.abort(); clearInterval(interval)
      window.removeEventListener('focus', refresh)
      socket.off('match_completed', update); socket.off('connect', watch); socket.off('disconnect', disconnected)
    }
  }, [matchId])

  async function judge(submit) {
    if (judgingRequest.current || !editable) return
    const controller = new AbortController()
    judgingRequest.current = controller
    setJudging(submit ? 'submit' : 'run'); setResult(null); setJudgeError('')
    try {
      const data = await judgeMatch(matchId, code, submit, controller.signal)
      setResult({ ...data, submitted: submit })
      if (data.match) setMatch(current => ({ ...current, ...data.match }))
    } catch (err) {
      if (!controller.signal.aborted) {
        setJudgeError(errorMessage(err))
        if (err.response?.status === 401) checkSession()
      }
    } finally {
      if (!controller.signal.aborted) setJudging('')
      judgingRequest.current = null
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    setMatch(null)
    getMatch(matchId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setMatch(data)
      setCode(data.problem.starterCode)
      setNow(Date.now())
    }).catch(err => {
      if (controller.signal.aborted) return
      if (err.response?.status === 401) {
        checkSession()
        return
      }
      setError({ status: err.response?.status, message: errorMessage(err) })
    })
    return () => controller.abort()
  }, [matchId, attempt, checkSession])

  useEffect(() => {
    if (!match?.endsAt || match.status !== 'in_progress') return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [match?.endsAt, match?.status])

  const { text: timerText, expired, hasDeadline } = getDuelClock(match?.endsAt, now)
  const completed = match?.status === 'completed'
  useEffect(() => {
    if (completed) navigate(resultPath(matchId), { replace: true })
  }, [completed, matchId, navigate])
  const editable = match?.status === 'in_progress' && hasDeadline && !expired
  const userId = String(user._id || user.id)
  const problem = match?.problem
  const unavailable = error?.status === 400 || error?.status === 404

  function resizeEditor(event) {
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startY = event.clientY
    const startHeight = editorHeight
    handle.onpointermove = move => setEditorHeight(Math.max(220, Math.min(1000, startHeight + move.clientY - startY)))
    const stop = () => {
      handle.onpointermove = null
      handle.onpointerup = null
      handle.onpointercancel = null
    }
    handle.onpointerup = stop
    handle.onpointercancel = stop
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#05080f] text-[#eef1f8]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-600 bg-[#0e121d] px-3 sm:px-4">
        <Link to="/dashboard" className="text-sm font-extrabold tracking-tight">CodeDuel</Link>
        <span className="max-w-[65%] truncate border border-slate-600 px-3 py-2 text-xs">{user.username}</span>
      </header>

      {!match ? <main className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          {error ? <>
            <h1 className="mb-3 text-xl font-bold">{error.status === 403 ? 'This match is private.' : unavailable ? 'Match unavailable.' : 'Unable to load the arena.'}</h1>
            <p role="alert" className="text-sm text-slate-400">{error.message}</p>
            {!unavailable && error.status !== 403 && <button onClick={() => setAttempt(value => value + 1)} className="mt-5 bg-[#b9ee36] px-5 py-3 font-mono text-xs font-bold text-black">TRY AGAIN</button>}
            <Link to="/dashboard" className="mt-5 block text-sm underline underline-offset-4">Back to dashboard</Link>
          </> : <p role="status" className="font-mono text-sm text-slate-400">Loading match…</p>}
        </div>
      </main> : <>
        <div className="grid min-h-20 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-slate-700 bg-[#080c14] px-4 py-3 sm:px-6">
          <p className="min-w-0 break-all font-mono text-[10px] font-bold tracking-wider">1V1 DUEL <span className="mt-1 block text-[9px] font-normal tracking-normal text-slate-400 sm:text-[10px]" title={match._id}>MATCH #{match._id.slice(0, 8).toUpperCase()}</span></p>
          <div className="px-2 text-center">
            <p role="timer" aria-label={`${timerText} remaining`} className="font-mono text-3xl font-semibold tabular-nums leading-none text-[#b9ee36] sm:text-4xl">{timerText}</p>
            <p className="mt-2 font-mono text-[9px] font-bold tracking-[0.2em] text-slate-400">{completed ? 'COMPLETED' : expired ? 'TIME EXPIRED' : 'REMAINING'}</p>
          </div>
          <Link to="/dashboard" title="Return to dashboard; this does not forfeit or end the match" className="inline-flex min-h-11 items-center justify-self-end border border-slate-600 px-3 py-2 text-xs font-semibold hover:bg-white/5">BACK</Link>
        </div>

        <section className="border-b border-slate-700 bg-[#fcf8eb] px-4 py-4 text-ink sm:px-6" aria-labelledby="problem-title">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 id="problem-title" className="break-words text-xl leading-tight font-bold tracking-tight sm:text-2xl">{problem.title}</h1>
              <span className="rounded-sm bg-[#b9ee36] px-2 py-1 font-mono text-[10px] font-bold uppercase">{problem.difficulty}</span>
            </div>
            <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="problem-body" aria-label={expanded ? 'Collapse problem' : 'Expand problem'} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center hover:bg-black/5">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
          </div>
          <div id="problem-body" hidden={!expanded}>
            <div className="mt-3 max-w-5xl space-y-2 text-sm leading-6 text-slate-700">
              {problem.description.split(/\n\s*\n/).map((paragraph, index) => <div key={index} className="space-y-1">
                {paragraph.split('\n').map((line, lineIndex) => {
                  const detail = line.match(/^(Arguments|Return|Constraints):\s*(.*)$/)
                  return <p key={lineIndex} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{detail ? <><span className="font-semibold text-ink">{detail[1]}: </span><span className="font-mono text-xs leading-6">{detail[2]}</span></> : line}</p>
                })}
              </div>)}
            </div>
            <h2 className="mt-4 font-mono text-[10px] font-bold tracking-[0.16em]">SAMPLE CASES</h2>
            <div className="mt-2 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
              {problem.sampleTestCases.map((sample, index) => <div key={index} className="min-w-0 border border-[#dce3f0] bg-[#e5ebf8]/60 px-3 py-3 font-mono text-xs leading-6">
                <p className="mb-1 text-[10px] font-semibold tracking-wider text-slate-500">SAMPLE {index + 1}</p>
                <pre className="whitespace-pre-wrap [overflow-wrap:anywhere]">Input: {sample.input}</pre>
                <pre className="whitespace-pre-wrap [overflow-wrap:anywhere]">Output: {sample.expectedOutput}</pre>
              </div>)}
            </div>
          </div>
        </section>

        <section aria-label="JavaScript coding area" className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-[#0e121d] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold">Code Editor</h2>
              <span className="border border-slate-600 px-2 py-1 font-mono text-[11px] text-slate-300">JavaScript</span>
            </div>
            <button onClick={() => setCode(problem.starterCode)} disabled={!editable} className="min-h-11 px-3 text-xs font-semibold text-slate-400 enabled:hover:text-white disabled:opacity-50">RESET</button>
          </div>
          <div style={{ height: editorHeight }} className="min-h-[220px] w-full min-w-0">
            <CodeEditor code={code} onChange={setCode} readOnly={!editable} />
          </div>
          <div role="separator" tabIndex={0} aria-label="Resize code editor" aria-orientation="horizontal" aria-valuemin={220} aria-valuemax={1000} aria-valuenow={editorHeight}
            onPointerDown={resizeEditor}
            onKeyDown={event => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
              event.preventDefault()
              setEditorHeight(height => Math.max(220, Math.min(1000, height + (event.key === 'ArrowDown' ? 40 : -40))))
            }}
            className="flex h-4 touch-none cursor-row-resize items-center justify-center border-y border-slate-600 bg-[#080c14] text-slate-500"><GripHorizontal size={16} /></div>
          <div role="group" aria-label="Code actions" className="flex flex-wrap justify-end gap-3 border-b border-slate-700 bg-[#0e121d] px-4 py-3 sm:px-6">
            <button onClick={() => judge(false)} disabled={!editable || !!judging} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-slate-500 px-4 py-3 text-xs font-semibold text-[#eef1f8] enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              {judging === 'run' && <LoaderCircle size={15} aria-hidden="true" className="motion-safe:animate-spin" />}{judging === 'run' ? 'RUNNING…' : 'RUN TESTS'}
            </button>
            <button onClick={() => judge(true)} disabled={!editable || !!judging} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-[#b9ee36] px-4 py-3 text-xs font-bold text-black enabled:hover:bg-[#cdf65c] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              {judging === 'submit' && <LoaderCircle size={15} aria-hidden="true" className="motion-safe:animate-spin" />}{judging === 'submit' ? 'JUDGING…' : 'SUBMIT SOLUTION'}
            </button>
          </div>
          <p role="status" className="flex items-center gap-2 bg-[#080c14] px-3 py-2 font-mono text-[10px] text-slate-400">
            {judging && <LoaderCircle size={14} aria-hidden="true" className="shrink-0 motion-safe:animate-spin" />}
            {completed ? matchResultText(match, userId) : expired ? 'Time has expired. No result is available yet.' : !hasDeadline ? 'Waiting for the server to provide the match deadline.' : match.status === 'waiting' ? 'Waiting for the match to start.' : judging ? 'Judging your code…' : 'Run samples to test your code. Submit to judge hidden tests.'}
          </p>
          {(!connection || syncError) && <p role="status" className="px-3 py-2 text-xs text-amber-300">{syncError || 'Socket disconnected. Match status is refreshed through the API.'}</p>}
          {judgeError && <p role="alert" className="px-3 py-2 text-xs text-red-300">{judgeError}</p>}
          {result && <section aria-label="Execution results" className="border-y border-slate-600 px-3 py-3 font-mono text-xs">
            <p role="status" className={`flex items-center gap-2 font-semibold ${result.verdict === 'Accepted' ? 'text-[#b9ee36]' : 'text-red-300'}`}>{result.verdict === 'Accepted' ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}{result.submitted ? 'SUBMISSION' : 'SAMPLE TESTS'}: {result.verdict}</p>
            {result.results?.map((test, index) => <div key={index} className="mt-3 border-l-2 border-slate-600 bg-white/[0.03] px-3 py-3 whitespace-pre-wrap [overflow-wrap:anywhere] leading-6 text-slate-300">
              <p className={`mb-2 font-semibold ${test.verdict === 'Accepted' ? 'text-[#b9ee36]' : 'text-red-300'}`}>Sample {index + 1}: {test.verdict}</p><p>Output: {test.output || '(empty)'}</p><p>Expected: {test.expectedOutput}</p>
              {test.error && <p className="text-red-300">{test.error}</p>}
            </div>)}
          </section>}
        </section>

        <footer aria-label="Players" className="grid grid-cols-2 divide-x divide-slate-600 border-t border-slate-600 bg-[#0e121d] text-[10px]">
          {[match.player1, match.player2].map((player, index) => <div key={player?._id || index} className="min-w-0 px-4 py-3 sm:px-6">
            <p className={`font-mono text-[10px] tracking-wider ${player && String(player._id) === userId ? 'text-[#b9ee36]' : 'text-slate-400'}`}>{player && String(player._id) === userId ? 'YOU' : 'OPPONENT'}</p>
            <p className="mt-1 [overflow-wrap:anywhere] text-sm font-semibold">{player?.username || 'Awaiting player'}</p>
            {completed && <span className="mt-1 block font-mono text-[10px] text-slate-400">{!match.winner ? 'DRAW' : String(match.winner._id || match.winner) === String(player?._id) ? 'WINNER' : 'LOST'}</span>}
          </div>)}
        </footer>
      </>}
    </div>
  )
}
