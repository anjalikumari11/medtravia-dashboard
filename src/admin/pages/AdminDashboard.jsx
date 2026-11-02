import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/Icons'
import { getEnquiries } from '../services/adminApi'
import { clearAdminSession } from '../utils/auth'

const PAGE_SIZE = 20
const EMPTY_FILTERS = { search: '', date: '', treatment: '', status: '', country: '', destination: '' }

const pick = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== '') || ''
const field = {
  id: (item) => pick(item, 'id', '_id', 'enquiry_id'),
  name: (item) => pick(item, 'full_name', 'fullName', 'name'),
  phone: (item) => pick(item, 'phone', 'phone_number', 'mobile'),
  email: (item) => pick(item, 'email', 'email_address'),
  treatment: (item) => pick(item, 'treatment', 'treatment_name', 'procedure', 'medical_treatment'),
  destination: (item) => pick(item, 'preferred_destination', 'preferredDestination', 'destination'),
  country: (item) => pick(item, 'country', 'country_name'),
  message: (item) => pick(item, 'message', 'notes', 'query', 'description'),
  status: (item) => pick(item, 'status', 'enquiry_status'),
  createdAt: (item) => pick(item, 'created_at', 'createdAt', 'submitted_at', 'date'),
}

function formatDate(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date)
}

function normalizedPhone(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return digits
  return digits.length === 10 ? `91${digits}` : digits
}

function StatusBadge({ value }) {
  const status = String(value || 'New').trim()
  const className = status.toLowerCase().replace(/[^a-z]+/g, '-')
  return <span className={`status-badge status-badge--${className}`}>{status}</span>
}

function Sidebar({ open, onClose, onLogout }) {
  return (
    <>
      {open && <button className="sidebar-scrim" aria-label="Close navigation" type="button" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand"><img src="/medtravia-logo.png" alt="MedTravia" /></div>
        <nav aria-label="Admin navigation">
          <button className="nav-item nav-item--active" type="button" onClick={onClose}><Icon name="grid" /><span>Dashboard</span></button>
          <button className="nav-item" type="button" onClick={onClose}><Icon name="inbox" /><span>Enquiries</span><span className="nav-dot" /></button>
        </nav>
        <div className="sidebar-support">
          <span>ADMIN PORTAL</span>
          <p>Manage every patient enquiry with care.</p>
        </div>
        <button className="nav-item nav-item--logout" type="button" onClick={onLogout}><Icon name="logout" /><span>Sign out</span></button>
      </aside>
    </>
  )
}

function DetailDrawer({ enquiry, onClose }) {
  if (!enquiry) return null
  const phone = field.phone(enquiry)
  const whatsapp = normalizedPhone(phone)
  const rows = [
    ['Full name', field.name(enquiry)], ['Phone', phone], ['Email', field.email(enquiry)],
    ['Treatment', field.treatment(enquiry)], ['Preferred destination', field.destination(enquiry)],
    ['Country', field.country(enquiry)], ['Submitted', formatDate(field.createdAt(enquiry), true)],
  ]
  return (
    <div className="drawer-layer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button className="drawer-scrim" aria-label="Close enquiry details" type="button" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-header"><div><span className="eyebrow">ENQUIRY DETAILS</span><h2 id="drawer-title">{field.name(enquiry) || 'Unnamed enquiry'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <div className="drawer-status"><span>Status</span><StatusBadge value={field.status(enquiry)} /></div>
        <dl className="details-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
        <section className="message-box"><span><Icon name="message" size={17} /> Message</span><p>{field.message(enquiry) || 'No message provided.'}</p></section>
        <div className="drawer-actions">
          {phone && <a className="button button--secondary" href={`tel:${phone}`}><Icon name="phone" size={17} /> Call</a>}
          {whatsapp && <a className="button button--whatsapp" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {field.email(enquiry) && <a className="button button--primary" href={`mailto:${field.email(enquiry)}`}><Icon name="mail" size={17} /> Email</a>}
        </div>
      </aside>
    </div>
  )
}

export default function AdminDashboard({ session, onLogout }) {
  const [enquiries, setEnquiries] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => { setAppliedSearch(filters.search.trim()); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [filters.search])

  const loadEnquiries = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getEnquiries({ page, limit: PAGE_SIZE, search: appliedSearch, date: filters.date, treatment: filters.treatment, status: filters.status, country: filters.country, destination: filters.destination, sort: 'newest' })
      setEnquiries(result.items)
      setTotal(result.total)
    } catch (requestError) {
      setError(requestError.status === 401 ? 'Your session has expired. Please sign in again.' : 'Unable to load enquiries. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, filters.country, filters.date, filters.destination, filters.status, filters.treatment, page])

  useEffect(() => { loadEnquiries() }, [loadEnquiries])
  useEffect(() => {
    const unauthorized = () => { clearAdminSession(); onLogout() }
    window.addEventListener('admin:unauthorized', unauthorized)
    return () => window.removeEventListener('admin:unauthorized', unauthorized)
  }, [onLogout])

  const options = useMemo(() => ({
    treatments: [...new Set(enquiries.map(field.treatment).filter(Boolean))].sort(),
    statuses: [...new Set(enquiries.map(field.status).filter(Boolean))].sort(),
    countries: [...new Set(enquiries.map(field.country).filter(Boolean))].sort(),
    destinations: [...new Set(enquiries.map(field.destination).filter(Boolean))].sort(),
  }), [enquiries])

  const today = useMemo(() => enquiries.filter((item) => new Date(field.createdAt(item)).toDateString() === new Date().toDateString()).length, [enquiries])
  const thisWeek = useMemo(() => enquiries.filter((item) => { const date = new Date(field.createdAt(item)); return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() <= 7 * 86400000 }).length, [enquiries])
  const pending = useMemo(() => enquiries.filter((item) => ['new', 'pending'].includes(String(field.status(item) || 'new').toLowerCase())).length, [enquiries])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstResult = total ? (page - 1) * PAGE_SIZE + 1 : 0
  const lastResult = Math.min(page * PAGE_SIZE, total)
  const adminName = session?.user?.name || session?.user?.full_name || 'Admin'
  const adminEmail = session?.user?.email || 'Administrator'

  function updateFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); if (key !== 'search') setPage(1) }
  function resetFilters() { setFilters(EMPTY_FILTERS); setAppliedSearch(''); setPage(1) }

  return (
    <div className="admin-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={() => { clearAdminSession(); onLogout() }} />
      <main className="admin-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <div className="topbar-title"><span className="eyebrow">ADMIN OVERVIEW</span><h1>Enquiry Dashboard</h1></div>
          <div className="admin-profile"><span className="avatar"><Icon name="user" size={18} /></span><span><strong>{adminName}</strong><small>{adminEmail}</small></span></div>
        </header>

        <div className="dashboard-content">
          <section className="welcome-row"><div><h2>Good to see you, {adminName.split(' ')[0]}.</h2><p>Here’s the latest from your patient enquiries.</p></div><div className="date-chip"><Icon name="calendar" size={18} />{formatDate(new Date())}</div></section>
          <section className="stats-grid" aria-label="Enquiry statistics">
            {[['Total enquiries', total, 'All submissions'], ["Today's enquiries", today, 'In current results'], ['Last 7 days', thisWeek, 'In current results'], ['New / pending', pending, 'Needs attention']].map(([label, value, note], index) => (
              <article className={`stat-card stat-card--${index + 1}`} key={label}><div className="stat-icon"><Icon name={index === 0 ? 'inbox' : index === 3 ? 'message' : 'calendar'} /></div><div><span>{label}</span><strong>{loading ? '—' : value.toLocaleString('en-IN')}</strong><small>{note}</small></div></article>
            ))}
          </section>

          <section className="enquiries-panel">
            <div className="panel-heading"><div><h2>Patient enquiries</h2><p>Review and connect with prospective patients.</p></div><span className="result-pill">{total} total</span></div>
            <div className="filters">
              <label className="search-field"><span className="sr-only">Search enquiries</span><Icon name="search" size={19} /><input type="search" placeholder="Search by name, phone or email…" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} /></label>
              <label>
                <span className="sr-only">Filter by date</span>
                <input type="date" value={filters.date} onChange={(e) => updateFilter('date', e.target.value)} /></label>
              <label>
                <span className="sr-only">Filter by treatment</span>
                <select value={filters.treatment} onChange={(e) => updateFilter('treatment', e.target.value)}><option value="">All treatments</option>{options.treatments.map((value) => <option key={value}>{value}</option>)}</select>
              </label>
              <label>
                <span className="sr-only">Filter by status</span>
                <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                  <option value="">All statuses</option>{options.statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label>
                <span className="sr-only">Filter by country</span><select value={filters.country} onChange={(e) => updateFilter('country', e.target.value)}><option value="">All countries</option>{options.countries.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label><span className="sr-only">Filter by destination</span><select value={filters.destination} onChange={(e) => updateFilter('destination', e.target.value)}><option value="">All destinations</option>{options.destinations.map((value) => <option key={value}>{value}</option>)}</select></label>
              <button className="text-button " type="button" onClick={resetFilters}>Reset</button>
            </div>

            {error ? (
              <div className="table-state table-state--error"><span>!</span><h3>{error}</h3><p>The configured admin enquiry API could not be reached.</p><button className="button button--secondary" type="button" onClick={loadEnquiries}>Retry</button></div>
            ) : loading ? (
              <div className="table-scroll"><table><thead><tr>{['Patient', 'Contact', 'Treatment', 'Destination', 'Submitted', 'Status', 'Actions'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{Array.from({ length: 6 }).map((_, index) => <tr key={index}>{Array.from({ length: 7 }).map((__, cell) => <td key={cell}><span className="skeleton" /></td>)}</tr>)}</tbody></table></div>
            ) : enquiries.length === 0 ? (
              <div className="table-state"><div className="empty-icon"><Icon name="inbox" /></div><h3>{Object.values(filters).some(Boolean) ? 'No enquiries match your filters.' : 'No enquiries found.'}</h3><p>{Object.values(filters).some(Boolean) ? 'Try adjusting or clearing your filters.' : 'New patient submissions will appear here.'}</p>{Object.values(filters).some(Boolean) && <button className="button button--secondary" type="button" onClick={resetFilters}>Reset filters</button>}</div>
            ) : (
              <div className="table-scroll"><table><thead><tr><th>Patient</th><th>Contact</th><th>Treatment</th><th>Destination</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>{enquiries.map((item, index) => (
                <tr key={field.id(item) || `${field.email(item)}-${index}`}><td><div className="patient-cell"><span className="patient-avatar">{(field.name(item) || '?').charAt(0).toUpperCase()}</span><span><strong>{field.name(item) || 'Unnamed'}</strong><small>#{field.id(item) || '—'}</small></span></div></td><td><div className="contact-cell"><span>{field.phone(item) || '—'}</span><small>{field.email(item) || '—'}</small></div></td><td>{field.treatment(item) || '—'}</td><td><span>{field.destination(item) || '—'}</span><small className="table-subtext">{field.country(item)}</small></td><td>{formatDate(field.createdAt(item), true)}</td><td><StatusBadge value={field.status(item)} /></td><td><div className="row-actions"><button className="view-button" type="button" onClick={() => setSelected(item)}>View</button>{field.phone(item) && <a href={`tel:${field.phone(item)}`} aria-label={`Call ${field.name(item)}`}><Icon name="phone" size={17} /></a>}{field.email(item) && <a href={`mailto:${field.email(item)}`} aria-label={`Email ${field.name(item)}`}><Icon name="mail" size={17} /></a>}</div></td></tr>
              ))}</tbody></table></div>
            )}
            {!error && !loading && total > 0 && <div className="pagination"><span>Showing <strong>{firstResult}–{lastResult}</strong> of <strong>{total}</strong></span><div><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><Icon name="chevronLeft" size={18} /></button><span>Page {page} of {totalPages}</span><button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><Icon name="chevronRight" size={18} /></button></div></div>}
          </section>
        </div>
      </main>
      <DetailDrawer enquiry={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
