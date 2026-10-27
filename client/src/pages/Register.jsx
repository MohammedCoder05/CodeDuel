import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { ErrorNotice, Field, SubmitButton } from '../components/FormControls'
import { authService, errorMessage } from '../services/api'

export default function Register() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    setError('')
    if (data.get('password') !== data.get('confirmPassword')) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await authService.register({ username: data.get('username').trim(), email: data.get('email').trim(), password: data.get('password') })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  return (
    <AuthLayout>
      <div className="mb-8 border-b border-line pb-6">
        <h1 className="text-4xl font-bold tracking-tight">Join the arena.</h1>
        <p className="mt-2 text-neutral-600">Create your account and find your opponent.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <ErrorNotice message={error} />
        <Field id="username" label="Username" autoComplete="username" placeholder="choose a username" disabled={busy} />
        <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" disabled={busy} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" placeholder="••••••••" disabled={busy} />
        <Field id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" placeholder="••••••••" disabled={busy} />
        <SubmitButton busy={busy}>{busy ? 'Creating account…' : 'Create account'}</SubmitButton>
      </form>
      <p className="mt-6 border-t border-line pt-5 text-sm text-neutral-600">Already have an account? <Link to="/login" className="font-bold text-black underline underline-offset-4">Log in</Link></p>
    </AuthLayout>
  )
}
