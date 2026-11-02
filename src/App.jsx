import { useEffect, useState } from 'react'
import AdminDashboard from './admin/pages/AdminDashboard'
import AdminLogin from './admin/pages/AdminLogin'
import { getAdminSession, isAdminSession } from './admin/utils/auth'
import './App.css'

const LOGIN_PATH = '/admin/login'
const DASHBOARD_PATH = '/admin/dashboard'

function navigate(path, { replace = false } = {}) {
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [session, setSession] = useState(getAdminSession())

  useEffect(() => {
    const handleRouteChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  useEffect(() => {
    if (path.startsWith('/admin') && path !== LOGIN_PATH && !isAdminSession(session)) {
      navigate(LOGIN_PATH, { replace: true })
    }
  }, [path, session])

  if (path === LOGIN_PATH) {
    return <AdminLogin onAuthenticated={(nextSession) => { setSession(nextSession); navigate(DASHBOARD_PATH, { replace: true }) }} isAlreadyAuthenticated={isAdminSession(session)} onContinue={() => navigate(DASHBOARD_PATH, { replace: true })} />
  }

  if (path.startsWith('/admin') && isAdminSession(session)) {
    return <AdminDashboard session={session} onLogout={() => { setSession(null); navigate(LOGIN_PATH, { replace: true }) }} />
  }

  return (
    <main className="route-fallback">
      <img src="/medtravia-logo.png" alt="MedTravia" />
      <h1>MedTravia Admin</h1>
      <p>Secure access for authorised administrators.</p>
      <button className="button button--primary" type="button" onClick={() => navigate(LOGIN_PATH)}>Go to admin login</button>
    </main>
  )
}

export default App
