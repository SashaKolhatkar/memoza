import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Empty, Field, Modal, SectionHead, Switch } from '../components/ui'
import { cx, formatTime, localDateKey, relativeDay, toLocalInput } from '../lib/utils'

const emptyEvent = () => ({
  title: '', event_type: 'appointment', start_at: `${localDateKey()}T09:00`, end_at: '',
  prep_minutes: 0, travel_minutes: 0, reminder_minutes: 30, location: '', notes: '',
})

export default function CalendarPage() {
  const { events, tasks, actions, toast, refresh } = useApp()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyEvent())
  const [upcoming, setUpcoming] = useState([])
  const [google, setGoogle] = useState({ configured: false, connected: false, message: 'Checking calendar connection…' })
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { api.events.upcoming(6).then(setUpcoming).catch(() => {}) }, [events, tasks])

  useEffect(() => {
    let active = true
    api.google.status().then((result) => { if (active) setGoogle(result) }).catch(() => {})
    const result = new URLSearchParams(window.location.search).get('google')
    if (result === 'connected') toast('Google Calendar connected. You can import events now.', 'gentle')
    if (result === 'error') toast('Google Calendar could not be connected. Please try again.', 'warn')
    return () => { active = false }
  }, [toast])

  const connectGoogle = async () => {
    try {
      const result = await api.google.connect()
      const target = new URL(result.url)
      if (target.protocol !== 'https:' || target.hostname !== 'accounts.google.com') {
        throw new Error('Unexpected sign-in URL. Please try again.')
      }
      window.location.assign(target.href)
    } catch (error) { toast(error.message, 'warn') }
  }

  const importGoogle = async () => {
    setSyncing(true)
    try {
      const result = await api.google.importEvents()
      await refresh()
      toast(result.message, 'gentle')
    } catch (error) { toast(error.message, 'warn') } finally { setSyncing(false) }
  }

  const disconnectGoogle = async () => {
    try {
      const result = await api.google.disconnect()
      setGoogle((current) => ({ ...current, connected: false, email: null, message: 'Disconnected. DAYFLOW events were left untouched.' }))
      toast(result.message, 'gentle')
    } catch (error) { toast(error.message, 'warn') }
  }

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const gridStart = new Date(first)
    gridStart.setDate(first.getDate() - offset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
  }, [month])

  const eventsByDay = useMemo(() => {
    const map = {}
    events.forEach((event) => {
      const key = localDateKey(event.start_at)
      map[key] = [...(map[key] || []), { ...event, kind: 'event' }]
    })
    tasks.filter((task) => task.due_at && task.status !== 'done').forEach((task) => {
      const key = localDateKey(task.due_at)
      map[key] = [...(map[key] || []), { id: task.id, title: `Due: ${task.title}`, start_at: task.due_at, kind: 'deadline' }]
    })
    return map
  }, [events, tasks])

  const save = async () => {
    if (!form.title.trim()) return
    const payload = {
      ...form,
      title: form.title.trim(),
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      prep_minutes: Number(form.prep_minutes) || 0,
      travel_minutes: Number(form.travel_minutes) || 0,
      reminder_minutes: Number(form.reminder_minutes) || 0,
    }
    if (modal?.id) await actions.updateEvent(modal.id, payload)
    else await actions.createEvent(payload)
    setModal(null)
  }

  const shiftMonth = (count) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + count, 1))

  return (
    <div className="stack">
      <SectionHead
        title="Calendar"
        actions={<button className="btn btn-primary" onClick={() => { setForm(emptyEvent()); setModal({ create: true }) }}><Plus size={16} /> Add event</button>}
      />

      <section className="panel flat">
        <div className="row">
          <CalendarDays size={17} color="var(--sky-deep)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="small strong">Google Calendar</div>
            <div className="tiny muted">
              {google.connected
                ? `Connected${google.email ? ` as ${google.email}` : ''}. Read only — nothing is written back.`
                : google.message}
            </div>
          </div>
          {google.connected ? (
            <>
              <button className="btn btn-sm btn-soft" onClick={importGoogle} disabled={syncing}>{syncing ? 'Importing…' : 'Import events'}</button>
              <button className="btn btn-sm btn-quiet" onClick={disconnectGoogle}>Disconnect</button>
            </>
          ) : (
            <button className="btn btn-sm btn-soft" onClick={connectGoogle} disabled={!google.configured}>Connect</button>
          )}
        </div>
      </section>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(260px, .9fr)', alignItems: 'start' }}>
        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <button className="icon-btn" onClick={() => shiftMonth(-1)} title="Previous month"><ChevronLeft size={17} /></button>
            <h2 style={{ margin: 0 }}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <button className="icon-btn" onClick={() => shiftMonth(1)} title="Next month"><ChevronRight size={17} /></button>
          </div>
          <div className="calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="weekday-head">{day}</div>)}
            {days.map((date) => {
              const key = localDateKey(date)
              const items = eventsByDay[key] || []
              return (
                <div key={key} className={cx('calendar-day', key === localDateKey() && 'today', date.getMonth() !== month.getMonth() && 'other')} onClick={() => { setForm({ ...emptyEvent(), start_at: `${key}T09:00` }); setModal({ create: true }) }}>
                  <div className="day-num">{date.getDate()}</div>
                  {items.slice(0, 3).map((item) => (
                    <div
                      key={item.id} className={cx('calendar-event', item.kind)} title={item.title}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (item.kind !== 'event') return
                        setForm({ ...item, start_at: toLocalInput(item.start_at), end_at: item.end_at ? toLocalInput(item.end_at) : '' })
                        setModal({ id: item.id })
                      }}
                    >{item.title}</div>
                  ))}
                  {items.length > 3 && <div className="tiny muted">+{items.length - 3} more</div>}
                </div>
              )
            })}
          </div>
        </section>

        <details className="more-fields">
          <summary>Upcoming & buffers</summary>
          <div className="stack">
            <section className="panel tint-sky">
              <div className="eyebrow">Coming up</div>
              {upcoming.length === 0
                ? <Empty icon={CalendarDays}>Nothing on the horizon.</Empty>
                : upcoming.map((item) => (
                  <div key={item.id} className="reminder-line">
                    <span className="reminder-dot" style={{ background: item.kind === 'deadline' ? 'var(--peach)' : 'var(--sky)' }} />
                    <div style={{ flex: 1 }}>
                      <div className="strong" style={{ fontSize: 13 }}>{item.title}</div>
                      <div className="small muted">{relativeDay(item.at)} · {formatTime(item.at)}</div>
                    </div>
                  </div>
                ))}
            </section>
          </div>
        </details>
      </div>

      <Modal
        open={!!modal} onClose={() => setModal(null)}
        title={modal?.id ? 'Edit calendar entry' : 'Add calendar entry'}
        subtitle="Include the time you need before and after — not just the meeting itself."
        footer={<>
          {modal?.id && <button className="btn btn-quiet" onClick={async () => { await actions.removeEvent(modal.id); setModal(null) }}><Trash2 size={14} /> Delete</button>}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>Save</button>
        </>}
      >
        <div className="stack">
          <Field label="Title"><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Team check-in" /></Field>
          <div className="grid-2">
            <Field label="Starts"><input className="input" type="datetime-local" value={form.start_at} onChange={(event) => setForm({ ...form, start_at: event.target.value })} /></Field>
            <Field label="Ends (optional)"><input className="input" type="datetime-local" value={form.end_at} onChange={(event) => setForm({ ...form, end_at: event.target.value })} /></Field>
          </div>
          <details className="more-fields">
            <summary>More options</summary>
            <div className="stack">
              <div className="grid-2">
                <Field label="Type"><select className="select" value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value })}><option value="appointment">Appointment</option><option value="deadline">Deadline</option><option value="personal">Personal</option></select></Field>
                <Field label="Location"><input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Optional" /></Field>
                <Field label="Preparation minutes"><input className="input" type="number" min="0" max="480" value={form.prep_minutes} onChange={(event) => setForm({ ...form, prep_minutes: event.target.value })} /></Field>
                <Field label="Travel minutes"><input className="input" type="number" min="0" max="480" value={form.travel_minutes} onChange={(event) => setForm({ ...form, travel_minutes: event.target.value })} /></Field>
                <Field label="Remind me before"><select className="select" value={form.reminder_minutes} onChange={(event) => setForm({ ...form, reminder_minutes: event.target.value })}><option value={0}>At the time</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={1440}>1 day</option></select></Field>
              </div>
              <Field label="Notes"><textarea className="textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
          </details>
        </div>
      </Modal>
    </div>
  )
}
