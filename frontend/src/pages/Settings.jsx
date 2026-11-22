import { useState } from 'react'
import { Contrast, Download, Heart, LifeBuoy, LogOut, Mail, Moon, RefreshCcw, ShieldCheck, Sun, Trash2, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { resetLocal } from '../lib/localStore'
import BuddyCustomizer from '../components/BuddyCustomizer'
import MusicPicker from '../components/MusicPicker'
import { Field, Modal, SectionHead, Switch } from '../components/ui'
import { cx, SUPPORT_EMAIL } from '../lib/utils'

export default function Settings() {
  const { user, setUser, preferences, setPreference, setNotificationPreference, theme, mode, toast, refresh } = useApp()
  const [authModal, setAuthModal] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const homeHref = import.meta.env.BASE_URL

  const clearBuddyMemory = () => {
    try {
      if (user?.id) localStorage.removeItem(`dayflow:buddy-memory:${user.id}`)
    } catch { /* nothing to clear */ }
  }

  const download = async () => {
    try {
      const result = await api.auth.exportData()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `memoza-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast('Your data export is ready.', 'gentle')
    } catch (error) { toast(error.message, 'warn') }
  }

  const submitAuth = async () => {
    try {
      const result = authModal === 'register'
        ? await api.auth.register(form)
        : await api.auth.login({ email: form.email, password: form.password })
      setUser(result.user)
      setAuthModal(null)
      await refresh()
      toast('You are signed in. Your workspace is private to you.', 'gentle')
    } catch (error) { toast(error.message, 'warn') }
  }

  return (
    <div className="stack">
      <SectionHead title="Settings" />

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="eyebrow">Appearance</div>
          <h2 style={{ marginTop: 6 }}>Theme</h2>
          <div className="row-wrap">
            {[
              { id: 'light', label: 'Warm light', icon: Sun },
              { id: 'dark', label: 'Soft dark', icon: Moon },
              { id: 'white', label: 'Clean white', icon: Contrast },
              { id: 'bluepink', label: 'Blue pink', icon: Heart },
            ].map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  className={cx('btn', theme === option.id ? 'btn-primary' : 'btn-ghost')}
                  onClick={() => setPreference('theme', option.id)}
                >
                  <Icon size={15} /> {option.label}
                </button>
              )
            })}
          </div>
          <div className="divider" />
          <Switch checked={!!preferences.reduceMotion} onChange={(value) => setPreference('reduceMotion', value)} label="Reduce motion and animations" />
        </section>

        <details className="more-fields">
          <summary>Focus defaults & reminders</summary>
          <div className="stack">
            <div className="grid-2">
              <Field label="Default focus session">
                <select className="select" value={preferences.defaultSessionMinutes} onChange={(event) => setPreference('defaultSessionMinutes', Number(event.target.value))}>
                  {[2, 5, 15, 25, 45, 50].map((value) => <option key={value} value={value}>{value} minutes</option>)}
                </select>
              </Field>
              <Field label="Default break">
                <select className="select" value={preferences.defaultBreakMinutes} onChange={(event) => setPreference('defaultBreakMinutes', Number(event.target.value))}>
                  {[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value} minutes</option>)}
                </select>
              </Field>
            </div>
            <div className="stack-sm">
              <Switch checked={!!preferences.gentleReminders} onChange={(value) => setPreference('gentleReminders', value)} label="Gentle time reminders" />
              <Switch checked={!!preferences.breakReminders} onChange={(value) => setPreference('breakReminders', value)} label="Break suggestions" />
              <Switch checked={!!preferences.notificationPreferences?.tasks} onChange={(value) => setNotificationPreference('tasks', value)} label="Task reminders" />
              <Switch checked={!!preferences.notificationPreferences?.events} onChange={(value) => setNotificationPreference('events', value)} label="Appointment and deadline notifications" />
              <Switch checked={!!preferences.notificationPreferences?.routines} onChange={(value) => setNotificationPreference('routines', value)} label="Routine reminders" />
              <Switch checked={!!preferences.notificationPreferences?.sound} onChange={(value) => setNotificationPreference('sound', value)} label="Soft sound at session end" />
            </div>
            <div className="divider" />
            <div className="stack-sm">
              <div className="eyebrow">Focus soundtrack</div>
              <MusicPicker />
            </div>
          </div>
        </details>
      </div>

      <section className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="brand-mark"><Heart size={18} color="var(--peach-deep)" /></div>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Your companion</div>
            <h2 style={{ margin: 0 }}>Buddy</h2>
          </div>
        </div>
        <BuddyCustomizer />
      </section>

      <section className="panel">
        <div className="row">
          <div className="brand-mark"><UserRound size={18} color="var(--lavender-deep)" /></div>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Account</div>
            <h2 style={{ margin: 0 }}>{user?.name || 'Your workspace'}</h2>
            <div className="small muted">{user?.email || 'Not signed in'} · {mode === 'server' ? (user?.is_demo ? 'Demo account with sample data' : 'Private account') : 'Local browser workspace'}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => { setForm({ name: '', email: '', password: '' }); setAuthModal('login') }}>Sign in</button>
          <button className="btn btn-soft" onClick={() => { setForm({ name: '', email: '', password: '' }); setAuthModal('register') }}>Create account</button>
        </div>
      </section>

      <section className="panel" id="support">
        <div className="row" style={{ marginBottom: 8 }}>
          <div className="brand-mark"><LifeBuoy size={18} color="var(--sage-deep)" /></div>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Need a hand?</div>
            <h2 style={{ margin: 0 }}>Contact & support the owner</h2>
          </div>
        </div>
        <p className="small muted" style={{ margin: '0 0 10px' }}>
          Questions, feedback, or a kind donation? Write to the owner directly. Memoza does not take payment inside the app.
        </p>
        <div className="row-wrap">
          <a className="btn btn-sm btn-primary" href={`mailto:${SUPPORT_EMAIL}?subject=Memoza%20feedback`}><Mail size={14} /> Email the owner</a>
          <a className="btn btn-sm btn-soft" href={`mailto:${SUPPORT_EMAIL}?subject=Supporting%20Memoza`}><Heart size={14} /> Support the owner</a>
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>Owner email: {SUPPORT_EMAIL}</div>
      </section>

      <details className="more-fields">
        <summary>Your data & privacy</summary>
        <div className="stack">
          <section className="panel">
            <div className="row-wrap">
              <button className="btn btn-ghost" onClick={download}><Download size={15} /> Download my data (JSON)</button>
              {mode === 'local' && <button className="btn btn-ghost" onClick={async () => { resetLocal(); await refresh(); toast('Local workspace reset to an empty workspace.', 'gentle') }}><RefreshCcw size={15} /> Reset local workspace</button>}
              <button className="btn btn-ghost" onClick={async () => { clearBuddyMemory(); api.auth.logout(); window.location.assign(homeHref) }}><LogOut size={15} /> Sign out</button>
              <button className="btn btn-ghost" style={{ color: 'var(--peach-deep)' }} onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete my account and data</button>
            </div>
          </section>
          <section className="panel flat">
            <div className="row"><ShieldCheck size={19} color="var(--sage-deep)" /><strong className="small">A note about privacy</strong></div>
            <p className="small" style={{ margin: '7px 0 0' }}>Memoza is a planning tool, not a medical service. It does not diagnose, treat, or make clinical predictions. Sample content, when used, is always labelled as demo data.</p>
          </section>
        </div>
      </details>

      <Modal
        open={!!authModal} onClose={() => setAuthModal(null)}
        title={authModal === 'register' ? 'Create your account' : 'Welcome back'}
        subtitle="Your workspace stays private to your account."
        footer={<><button className="btn btn-ghost" onClick={() => setAuthModal(null)}>Cancel</button><button className="btn btn-primary" onClick={submitAuth} disabled={!form.email || !form.password || (authModal === 'register' && !form.name)}>Continue</button></>}
      >
        <div className="stack">
          {authModal === 'register' && <Field label="Name"><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>}
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Password" hint={authModal === 'register' ? 'At least 8 characters.' : undefined}><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
          {mode === 'local' && <p className="tiny muted">Local mode stores your workspace in this browser. Start the FastAPI backend to create a server account.</p>}
        </div>
      </Modal>

      <Modal
        open={confirmDelete} onClose={() => setConfirmDelete(false)}
        title="Delete everything?"
        subtitle="This removes your account and all personal data. It cannot be undone."
        footer={<><button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Keep my data</button><button className="btn btn-peach" onClick={async () => {
          try { await api.auth.deleteAccount(); clearBuddyMemory(); window.location.assign(homeHref) } catch (error) { toast(error.message, 'warn') }
        }}>Yes, delete permanently</button></>}
      >
        <div className="panel flat tint-peach" style={{ padding: 14 }}>
          <p className="small" style={{ margin: 0 }}>If you are unsure, download your data first. There is no judgement either way — this is simply your choice.</p>
        </div>
      </Modal>
    </div>
  )
}
