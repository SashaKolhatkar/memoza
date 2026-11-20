import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, Info, PenLine, Sparkles, Target, X } from 'lucide-react'
import { cx } from '../lib/utils'
import { useApp } from '../context/AppContext'

export function Modal({ open, onClose, title, subtitle, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
      <div className={cx('modal', wide && 'wide')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="small" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn plain" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <div className={cx('field', className)}>
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
      <span className="switch">
        <input type="checkbox" checked={!!checked} onChange={(event) => onChange(event.target.checked)} />
        <span />
      </span>
      {label && <span className="small">{label}</span>}
    </label>
  )
}

export function Empty({ icon: Icon = Sparkles, title, children }) {
  return (
    <div className="empty">
      <Icon size={22} style={{ opacity: .6, marginBottom: 8 }} />
      {title && <div className="strong" style={{ color: 'var(--ink)', marginBottom: 3 }}>{title}</div>}
      {children}
    </div>
  )
}

export function SectionHead({ eyebrow, title, description, actions }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <span className="spacer" />
      {actions}
    </div>
  )
}

export function Progress({ value, max = 100, tone }) {
  const percent = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${percent}%`, background: tone }} />
    </div>
  )
}

export function ModeIcon({ id, size = 20 }) {
  const Icon = { rough: PenLine, good_enough: Target, polish_later: Sparkles }[id] || Sparkles
  return <Icon size={size} />
}

export function Toasts() {
  const { toasts } = useApp()
  return createPortal(
    <div className="toasts">
      {toasts.map((item) => (
        <div key={item.id} className={cx('toast', item.tone === 'warn' && 'warn')}>
          {item.tone === 'warn' ? <Info size={17} style={{ flex: 'none', marginTop: 2, color: 'var(--peach-deep)' }} /> : <Check size={17} style={{ flex: 'none', marginTop: 2, color: 'var(--sage-deep)' }} />}
          <span>{item.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function TimeRing({ remaining, total, mode = 'task', children }) {
  const radius = 130
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
  return (
    <div className={cx('timer-ring', mode !== 'task' && 'break')}>
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <circle className="timer-track" cx="150" cy="150" r={radius} />
        <circle
          className="timer-progress" cx="150" cy="150" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="timer-center">{children}</div>
    </div>
  )
}

export function formatClock(seconds) {
  const safe = Math.max(0, seconds || 0)
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}
