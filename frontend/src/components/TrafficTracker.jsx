import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { API_BASE, api } from '../lib/api'
import { useApp } from '../context/AppContext'

function token(storage, key) {
  try {
    const saved = storage.getItem(key)
    if (saved) return saved
    const fresh = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    storage.setItem(key, fresh)
    return fresh
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

export default function TrafficTracker() {
  const location = useLocation()
  const { ready, mode } = useApp()

  useEffect(() => {
    if (!ready || mode !== 'server') return
    let referrerHost = ''
    try {
      if (document.referrer) referrerHost = new URL(document.referrer).hostname.slice(0, 120)
    } catch { /* referrer is optional */ }

    const width = window.innerWidth
    const payload = {
      path: location.pathname || '/',
      visitor_id: token(localStorage, 'dayflow:visitor-id'),
      session_id: token(sessionStorage, 'dayflow:session-id'),
      device: width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
      referrer_host: referrerHost,
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon(`${API_BASE}/traffic/view`, blob)
    } else {
      api.traffic.view(payload).catch(() => { /* traffic is non-critical */ })
    }
  }, [location.pathname, ready, mode])

  return null
}
