import { lazy, Suspense } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SocketLayout from './components/SocketLayout'
import Play from './pages/Play'
import History from './pages/History'
import MatchResult from './pages/MatchResult'

const Duel = lazy(() => import('./pages/Duel'))

function Guard({ authenticated }) {
  const { user } = useAuth()
  return Boolean(user) === authenticated ? <Outlet /> : <Navigate to={user ? '/dashboard' : '/login'} replace />
}

export default function App() {
  const { user, loading, error, checkSession } = useAuth()
  if (loading || error) return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="mb-6 text-3xl font-black tracking-tighter">CodeDuel</p>
        {loading ? <p role="status" className="flex items-center justify-center gap-3 font-mono text-sm"><LoaderCircle size={18} className="motion-safe:animate-spin" /> Checking your session…</p> : <>
          <p role="alert" className="mb-5 text-sm text-neutral-600">{error}</p>
          <button onClick={checkSession} className="inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-bold text-paper"><RefreshCw size={16} /> Try again</button>
        </>}
      </div>
    </main>
  )
  return (
    <Routes>
      <Route element={<Guard authenticated={false} />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<Guard authenticated />}>
        <Route element={<SocketLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/matches/:matchId/result" element={<MatchResult />} />
          <Route path="/play" element={<Play />} />
          <Route path="/duel/:matchId" element={<Suspense fallback={<main role="status" className="min-h-screen bg-ink p-8 font-mono text-sm text-paper">Loading arena…</main>}><Duel /></Suspense>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
