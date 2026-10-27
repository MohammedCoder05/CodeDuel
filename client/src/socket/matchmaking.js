// One controller per authenticated layout; no socket creation or automatic enqueue.
export function createMatchmaking(socket, now = Date.now) {
  let state = { phase: 'idle', connected: socket.connected, message: '', startedAt: null, stoppedAt: null }
  const subscribers = new Set()
  let listening = false
  const update = patch => {
    state = { ...state, ...patch }
    subscribers.forEach(listener => listener())
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    start() {
      // This synchronous guard also covers clicks before React has re-rendered.
      if (!listening || !socket.connected || state.phase === 'searching') return false
      update({ phase: 'searching', connected: true, message: 'Waiting for the server…', startedAt: now(), stoppedAt: null })
      socket.emit('find_match')
      return true
    },
    attach(onMatch) {
      const stop = (phase, message) => update({ phase, message, stoppedAt: state.phase === 'searching' ? now() : state.stoppedAt })
      const onConnect = () => update({ connected: true, message: state.phase === 'idle' ? '' : state.message })
      const onDisconnect = () => {
        update({ connected: false })
        if (state.phase === 'searching') stop('interrupted', 'Connection lost. Your queue position is no longer confirmed. Reconnect, then retry.')
      }
      const onConnectError = error => {
        update({ connected: false })
        stop(state.phase === 'searching' ? 'interrupted' : state.phase, `Unable to connect: ${error.message || 'Please try again.'}`)
      }
      const onSearching = payload => {
        if (state.phase === 'searching') update({ message: payload?.message || 'Waiting for an opponent…' })
      }
      const onError = payload => {
        if (state.phase === 'searching') stop('error', payload?.message || 'Matchmaking failed. Please try again.')
      }
      const onFound = payload => {
        if (state.phase !== 'searching') return
        if (typeof payload?.matchId !== 'string' || !payload.matchId) {
          stop('error', 'The server did not return a match ID. Please try again.')
          return
        }
        stop('matched', payload.message || 'Opponent found!')
        onMatch(payload.matchId)
      }
      const handlers = { connect: onConnect, disconnect: onDisconnect, connect_error: onConnectError, match_searching: onSearching, match_error: onError, match_found: onFound }
      Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler))
      listening = true
      update({ connected: socket.connected })
      return () => {
        listening = false
        Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler))
      }
    },
  }
}

export function searchElapsed(state, now = Date.now()) {
  const seconds = state.startedAt === null ? 0 : Math.max(0, Math.floor(((state.stoppedAt ?? now) - state.startedAt) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
