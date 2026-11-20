import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, CalendarDays, Clock3, Contrast, Heart, LayoutDashboard, LayoutGrid, Lightbulb, ListTodo,
  Moon, NotebookPen, Pause, Play, Repeat2, RotateCcw, Settings as SettingsIcon,
  Sparkles, Sun, Trophy,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { cx, formatDate } from '../lib/utils'
import { formatClock } from './ui'

// Everyday choices up front. Everything else lives behind one "More" toggle.
const NAV = [
  { to: '/', label: 'Today', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/brain-dump', label: 'Capture', icon: Lightbulb },
  { to: '/focus', label: 'Focus', icon: NotebookPen },
]

const MORE_NAV = [
  { to: '/matrix', label: 'Matrix', icon: LayoutGrid },
  { to: '/routines', label: 'Routines', icon: Repeat2 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/progress', label: 'Progress', icon: Trophy },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

const OWNER_NAV = { to: '/owner', label: 'Traffic', icon: Activity }

function moreItemsFor(user) {
  return user?.is_owner ? [...MORE_NAV, OWNER_NAV] : MORE_NAV
}

const MOBILE_NAV = NAV

const THEMES = [
  { id: 'light', label: 'Warm light', icon: Sun },
  { id: 'dark', label: 'Soft dark', icon: Moon },
  { id: 'white', label: 'Clean white', icon: Contrast },
  { id: 'bluepink', label: 'Blue pink', icon: Heart },
]

function isActive(to, pathname) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to)
}

export function RestartButton({ compact = false, onClick }) {
  const { setRestartOpen } = useApp()
  return (
    <button className="restart-trigger" onClick={onClick || (() => setRestartOpen(true))} title="A gentle reset, whenever you need one">
      <RotateCcw size={15} />
      {!compact && <span>Restart</span>}
    </button>
  )
}

function Sidebar({ onResizeStart }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { tasks, user } = useApp()
  const openCount = tasks.filter((task) => task.status === 'today').length
  const link = (item) => {
    const Icon = item.icon
    const active = isActive(item.to, location.pathname)
    return (
      <a key={item.to} href={item.to} className={cx('nav-item', active && 'active')} onClick={(event) => {
        event.preventDefault()
        navigate(item.to)
      }}>
        <Icon size={17} strokeWidth={active ? 2.3 : 1.9} />
        <span>{item.label}</span>
        {item.to === '/tasks' && openCount > 0 && <span className="nav-badge">{openCount}</span>}
      </a>
    )
  }
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Sparkles size={19} color="var(--lavender-deep)" /></div>
        <div>
          <div className="brand-name">Memoza</div>
          <div className="brand-sub">a softer way to plan</div>
        </div>
      </div>
      <div className="sidebar-scroll">
        <nav className="nav-group">
          {NAV.map(link)}
          <details className="more-nav">
            <summary>More</summary>
            <div className="nav-group">{moreItemsFor(user).map(link)}</div>
          </details>
        </nav>
      </div>
      <div className="sidebar-foot">
        <RestartButton />
        <div className="side-note">
          <strong style={{ color: 'var(--ink)' }}>{user?.name?.split(' ')[0] || 'Hello'}.</strong> Progress is the point, not perfection. You can always begin again.
        </div>
      </div>
      <div className="sidebar-resizer" onPointerDown={onResizeStart} title="Drag to resize the sidebar" aria-hidden="true" />
    </aside>
  )
}

function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <nav className="mobile-nav">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon
        const active = isActive(item.to, location.pathname)
        return (
          <a key={item.to} href={item.to} className={cx(active && 'active')} onClick={(event) => {
            event.preventDefault()
            navigate(item.to)
          }}>
            <Icon size={19} />
            <span>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, setPreference, user, mode } = useApp()
  const moreItems = moreItemsFor(user)
  const current = [...NAV, ...moreItems].find((item) => isActive(item.to, location.pathname))
  const themeIndex = Math.max(0, THEMES.findIndex((item) => item.id === theme))
  const nextTheme = THEMES[(themeIndex + 1) % THEMES.length]
  const ThemeIcon = THEMES[themeIndex].icon
  return (
    <header className="topbar">
      <div>
        <div className="page-kicker">{formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div className="page-title">{current?.label || 'Today'}</div>
      </div>
      <div className="topbar-actions">
        {user?.is_demo && <span className="badge-demo">Demo data</span>}
        {mode === 'local' && <span className="chip sage">Local mode</span>}
        <RestartButton compact />
        <button
          className="icon-btn"
          onClick={() => setPreference('theme', nextTheme.id)}
          title={`Theme: ${THEMES[themeIndex].label}. Switch to ${nextTheme.label}.`}
          aria-label={`Switch theme to ${nextTheme.label}`}
        >
          <ThemeIcon size={17} />
        </button>
        <details className="more-menu">
          <summary title="More pages">More</summary>
          <div className="more-menu-list">
            {moreItems.map((item) => {
              const Icon = item.icon
              return (
                <a key={item.to} href={item.to} onClick={(event) => {
                  event.preventDefault()
                  navigate(item.to)
                }}>
                  <Icon size={15} /> {item.label}
                </a>
              )
            })}
          </div>
        </details>
        <div className="brand-mark" style={{ width: 34, height: 34, borderRadius: 11 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lavender-deep)' }}>
            {(user?.name || 'M').slice(0, 1).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  )
}

function FocusDock() {
  const { timer, focus } = useApp()
  const navigate = useNavigate()
  if (!timer) return null
  return (
    <div className="focus-dock">
      <Clock3 size={18} color="var(--lavender-deep)" />
      <div style={{ minWidth: 0 }}>
        <div className="dock-time">{formatClock(timer.remaining)}</div>
        <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {timer.mode === 'task' ? timer.taskTitle : 'Gentle break'}
        </div>
      </div>
      <span className="spacer" />
      <button className="icon-btn" onClick={() => timer.running ? focus.pause() : focus.resume()} title={timer.running ? 'Pause' : 'Resume'}>
        {timer.running ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button className="btn btn-sm btn-soft" onClick={() => navigate('/focus')}>Open</button>
    </div>
  )
}

export default function Layout({ children }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return Math.max(210, Math.min(380, Number(localStorage.getItem('dayflow:sidebar-width')) || 246)) }
    catch { return 246 }
  })

  useEffect(() => {
    try { localStorage.setItem('dayflow:sidebar-width', String(sidebarWidth)) } catch { /* width is optional */ }
  }, [sidebarWidth])

  const startResize = (event) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const move = (next) => setSidebarWidth(Math.max(210, Math.min(380, startWidth + next.clientX - startX)))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="app-shell" style={{ '--user-sidebar-width': `${sidebarWidth}px` }}>
      <Sidebar onResizeStart={startResize} />
      <div className="workspace">
        <Topbar />
        <main className="main">{children}</main>
      </div>
      <MobileNav />
      <FocusDock />
    </div>
  )
}
