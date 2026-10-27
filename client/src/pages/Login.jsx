import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { ErrorNotice, Field, SubmitButton } from '../components/FormControls'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await login({ username: data.get('username').trim(), password: data.get('password') })
      navigate('/dashboard', { replace: true })
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  return (
    <AuthLayout>
      <div className="mb-8 border-b border-line pb-6">
        <p className="mb-2 font-mono text-xs font-bold tracking-[0.2em] text-neutral-500">WELCOME BACK</p>
        <h1 className="text-4xl font-bold tracking-tight">Enter the arena.</h1>
        <p className="mt-2 text-neutral-600">Your next duel is waiting.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {location.state?.registered && <p role="status" className="text-sm text-green-800">Account created. Sign in to enter the arena.</p>}
        <ErrorNotice message={error} />
        <Field id="username" label="Username" autoComplete="username" placeholder="mohammed_dev" disabled={busy} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" placeholder="••••••••" disabled={busy} />
        <SubmitButton busy={busy}>{busy ? 'Signing in…' : 'Sign in'}</SubmitButton>
      </form>
      <p className="mt-6 border-t border-line pt-5 text-sm text-neutral-600">Don't have an account? <Link to="/register" className="font-bold text-black underline underline-offset-4">Create account</Link></p>
    </AuthLayout>
  )
}
