// Synchronous guard prevents repeated clicks before React renders the busy state.
export function createLogoutConfirmation() {
  let state = { open: false, busy: false, error: '' }
  const listeners = new Set()
  const update = patch => {
    state = { ...state, ...patch }
    listeners.forEach(listener => listener())
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    open() { if (!state.busy) update({ open: true, error: '' }) },
    close() { if (!state.busy) update({ open: false, error: '' }) },
    async confirm(logout, onSuccess, formatError) {
      if (!state.open || state.busy) return
      update({ busy: true, error: '' })
      try {
        await logout()
      } catch (error) {
        update({ busy: false, error: formatError(error) })
        return
      }
      update({ open: false, busy: false })
      onSuccess()
    },
  }
}
