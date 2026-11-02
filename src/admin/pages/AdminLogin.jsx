import { useState } from 'react'
import { Icon } from '../components/Icons'
import { loginAdmin } from '../services/adminApi'
import { saveAdminSession } from '../utils/auth'

export default function AdminLogin({ onAuthenticated, isAlreadyAuthenticated, onContinue }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')
    setLoading(true)
    try {
      const session = await loginAdmin({ email: email.trim(), password })
      saveAdminSession(session, remember)
      onAuthenticated(session)
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-accent login-accent--one" /><div className="login-accent login-accent--two" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <img src="/medtravia-logo.png" alt="MedTravia — Where Hope Finds a Way" />
        </div>
        <div className="login-heading"><span className="eyebrow">SECURE ADMIN PORTAL</span><h1 id="login-title">Welcome back</h1><p>Sign in to manage MedTravia enquiries.</p></div>
        {isAlreadyAuthenticated ? (
          <div className="session-notice"><p>You’re already signed in as an administrator.</p><button className="button button--primary button--full" type="button" onClick={onContinue}>Continue to dashboard</button></div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && <div className="alert alert--error" role="alert">{error}</div>}
            <label className="field"><span>Email address</span><input type="email" autoComplete="username" placeholder="admin@medtravia.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} /></label>
            <label className="field"><span>Password</span><div className="password-input"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={19} /></button></div></label>
            <label className="checkbox-row"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Remember me on this device</span></label>
            <button className="button button--primary button--full" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> Signing in…</> : 'Sign in securely'}</button>
          </form>
        )}
        <p className="login-footer">Authorised personnel only · Protected access</p>
      </section>
    </main>
  )
}
