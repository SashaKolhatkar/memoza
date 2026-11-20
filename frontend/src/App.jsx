import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import Layout from './components/Layout'
import RestartOverlay from './components/RestartOverlay'
import TrafficTracker from './components/TrafficTracker'
import ChibiChat from './components/ChibiChat'
import Celebrations from './components/Celebrations'
import { Toasts } from './components/ui'
import { useApp } from './context/AppContext'
import Dashboard from './pages/Dashboard'

const Tasks = lazy(() => import('./pages/Tasks'))
const BrainDump = lazy(() => import('./pages/BrainDump'))
const EisenhowerMatrix = lazy(() => import('./pages/EisenhowerMatrix'))
const FocusRoom = lazy(() => import('./pages/FocusRoom'))
const Routines = lazy(() => import('./pages/Routines'))
const CalendarPage = lazy(() => import('./pages/Calendar'))
const Progress = lazy(() => import('./pages/Progress'))
const Settings = lazy(() => import('./pages/Settings'))
const Traffic = lazy(() => import('./pages/Traffic'))

export default function App() {
  const { ready } = useApp()
  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div className="brand-mark" style={{ width: 56, height: 56, margin: '0 auto 14px' }}><Sparkles size={24} color="var(--lavender-deep)" /></div>
          <h1 style={{ fontSize: 30 }}>Memoza</h1>
          <p className="small muted">Making room for a gentler day…</p>
        </div>
      </div>
    )
  }
  return (
    <>
      <Layout>
        <TrafficTracker />
        <Suspense fallback={<div className="empty">Opening this part of your workspace…</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/brain-dump" element={<BrainDump />} />
            <Route path="/matrix" element={<EisenhowerMatrix />} />
            <Route path="/rough-draft" element={<Navigate to="/matrix" replace />} />
            <Route path="/focus" element={<FocusRoom />} />
            <Route path="/time" element={<Navigate to="/focus" replace />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/insights" element={<Navigate to="/progress" replace />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/owner" element={<Traffic />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
      <RestartOverlay />
      <ChibiChat />
      <Celebrations />
      <Toasts />
    </>
  )
}
