import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { LogOut, LoaderCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../services/api'
import { createLogoutConfirmation } from '../utils/logoutConfirmation'

export default function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [confirmation] = useState(createLogoutConfirmation)
  const { open, busy, error } = useSyncExternalStore(confirmation.subscribe, confirmation.getSnapshot)
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const stayRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const pointerOutside = useRef(false)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const trigger = triggerRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal() // Native modal traps focus and makes the background inert.
    stayRef.current.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open])

  const outside = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
  }

  return <>
    <button ref={triggerRef} onClick={confirmation.open} className="flex shrink-0 items-center gap-2 font-mono font-bold uppercase hover:text-acid"><LogOut size={15} aria-hidden="true" />Log out</button>
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); confirmation.close() }}
      onPointerDown={event => { pointerOutside.current = outside(event) }}
      onClick={event => { if (pointerOutside.current && outside(event)) confirmation.close(); pointerOutside.current = false }}
      className="fixed inset-0 m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-sm border border-line bg-paper p-6 text-ink shadow-xl backdrop:bg-ink/50 sm:p-8">
      <button type="button" aria-label="Close logout confirmation" disabled={busy} onClick={confirmation.close} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center hover:bg-ink/5 disabled:opacity-40"><X size={20} aria-hidden="true" /></button>
      <h2 id={titleId} className="pr-6 text-2xl font-bold tracking-tight">Leaving the arena?</h2>
      <p id={descriptionId} className="mt-3 font-sans text-sm leading-6 text-slate-600">Are you sure you want to log out of CodeDuel?</p>
      {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-700">{error}</p>}
      <div className="mt-7 flex flex-col-reverse gap-3 font-sans sm:flex-row">
        <button ref={stayRef} type="button" disabled={busy} onClick={confirmation.close} className="min-h-11 flex-1 border border-slate-400 px-4 py-3 text-sm font-semibold hover:bg-white disabled:opacity-50">Stay here</button>
        <button type="button" disabled={busy} onClick={() => confirmation.confirm(logout, () => navigate('/login', { replace: true }), errorMessage)} className="flex min-h-11 flex-1 items-center justify-center gap-2 bg-ink px-4 py-3 text-sm font-semibold text-[#b9ee36] hover:bg-slate-800 disabled:opacity-60">
          {busy && <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
          <span role="status">{busy ? 'Logging out…' : 'Log out'}</span>
        </button>
      </div>
    </dialog>
  </>
}
