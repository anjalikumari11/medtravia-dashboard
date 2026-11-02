import { clearAdminSession, getAccessToken } from '../utils/auth'

const FALLBACK_API_ORIGIN = 'http://192.168.68.53:8080'
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = (configuredBaseUrl || (import.meta.env.DEV ? '' : FALLBACK_API_ORIGIN)).replace(/\/+$/, '')

const LOGIN_ENDPOINT = import.meta.env.VITE_ADMIN_LOGIN_ENDPOINT
const ENQUIRIES_ENDPOINT = import.meta.env.VITE_ADMIN_ENQUIRIES_ENDPOINT
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000

function apiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

async function parseResponse(response, { handleUnauthorized = true } = {}) {
  const responseText = await response.text()
  let body = null
  if (responseText) {
    try {
      body = JSON.parse(responseText)
    } catch {
      body = { message: response.ok ? null : 'The server returned an invalid response.' }
    }
  }
  if (!response.ok) {
    if (response.status === 401 && handleUnauthorized) {
      clearAdminSession()
      window.dispatchEvent(new CustomEvent('admin:unauthorized'))
    }
    const validationMessage = body?.errors && Object.values(body.errors).flat().find(Boolean)
    const message = validationMessage || body?.message || body?.error || (response.status === 401 ? 'Your session has expired.' : 'Something went wrong. Please try again.')
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return body
}

async function request(path, options = {}, responseOptions = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(apiUrl(path), {
      // credentials: 'include',
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
      signal: controller.signal,
    })
    return await parseResponse(response, responseOptions)
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The server took too long to respond. Please try again.')
      timeoutError.status = 408
      throw timeoutError
    }
    if (error instanceof TypeError) throw new Error('Unable to connect to the MedTravia server. Check your network and try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function loginAdmin({ email, password }) {
  const data = await request(LOGIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }, { handleUnauthorized: false })
  const payload = data?.data && !Array.isArray(data.data) ? data.data : data
  const accessToken = payload?.access_token || payload?.accessToken || payload?.token || payload?.tokens?.accessToken || payload?.tokens?.access_token
  const user = payload?.user || payload?.admin || null
  const role = user?.role || user?.roles?.[0] || payload?.role || payload?.roles?.[0] || (LOGIN_ENDPOINT.includes('/admin/') ? 'admin' : '')
  if (!accessToken && !payload?.authenticated) throw new Error('The login response did not include a valid session.')
  if (String(role || '').toLowerCase() !== 'admin') throw new Error('This account does not have administrator access.')
  return { accessToken: accessToken || 'cookie-session', user, role }
}

export async function getEnquiries(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) query.set(key, value)
  })
  const token = getAccessToken()
  const data = await request(`${ENQUIRIES_ENDPOINT}?${query}`, {
    headers: { Accept: 'application/json', ...(token && token !== 'cookie-session' ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const nested = data?.data && !Array.isArray(data.data) ? data.data : null
  const items = Array.isArray(data) ? data : data?.items || (Array.isArray(data?.data) ? data.data : null) || data?.enquiries || data?.inquiries || data?.inquries || nested?.items || nested?.enquiries || nested?.inquiries || nested?.inquries || []
  return {
    items: Array.isArray(items) ? items : [],
    total: Number(data?.total ?? data?.pagination?.total ?? nested?.total ?? nested?.pagination?.total ?? items.length),
    page: Number(data?.page ?? data?.pagination?.page ?? nested?.page ?? nested?.pagination?.page ?? params.page ?? 1),
    limit: Number(data?.limit ?? data?.pagination?.limit ?? nested?.limit ?? nested?.pagination?.limit ?? params.limit ?? 20),
  }
}

export const adminApiConfig = { loginEndpoint: apiUrl(LOGIN_ENDPOINT), enquiriesEndpoint: apiUrl(ENQUIRIES_ENDPOINT) }
