import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { socket } from '../socket/socket'
import { createMatchmaking } from '../socket/matchmaking'

const MatchmakingContext = createContext(null)
export const useMatchmaking = () => useContext(MatchmakingContext)

// Keep the same socket alive when moving between authenticated pages.
export default function SocketLayout() {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  const { pathname } = useLocation()
  const [queue] = useState(() => createMatchmaking(socket))
  const state = useSyncExternalStore(queue.subscribe, queue.getSnapshot)

  useEffect(() => { navigateRef.current = navigate }, [navigate])

  useEffect(() => {
    const detach = queue.attach(matchId => navigateRef.current(`/duel/${encodeURIComponent(matchId)}`, { replace: true }))
    socket.connect()
    return () => { detach(); socket.disconnect() }
  }, [queue])

  useEffect(() => {
    if (state.phase !== 'searching') return
    const warnBeforeLeaving = event => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [state.phase])

  return <MatchmakingContext.Provider value={{ ...state, start: queue.start }}>
    {state.phase === 'searching' && pathname !== '/play' ? <Navigate to="/play" replace /> : <Outlet />}
  </MatchmakingContext.Provider>
}
