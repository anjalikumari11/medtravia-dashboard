const SESSION_KEY = 'medtravia_admin_session'

function readStorage(storage) {
  try {
    const value = storage.getItem(SESSION_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export function getAdminSession() {
  return readStorage(sessionStorage) || readStorage(localStorage)
}

export function isAdminSession(session) {
  if (!session?.accessToken) return false
  const role = session.user?.role || session.role
  return String(role || '').toLowerCase() === 'admin'
}

export function saveAdminSession(session, remember = false) {
  clearAdminSession()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearAdminSession() {
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_KEY)
}

export function getAccessToken() {
  return getAdminSession()?.accessToken || null
}
