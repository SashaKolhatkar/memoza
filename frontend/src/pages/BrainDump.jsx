import { useMemo, useState } from 'react'
import { ArrowRight, Lightbulb, ParkingCircle, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Empty, SectionHead } from '../components/ui'
import { cx, formatTime, relativeDay } from '../lib/utils'

const CATEGORIES = [
  { id: 'today', label: 'Today', tint: 'peach' },
  { id: 'upcoming', label: 'Upcoming', tint: 'sky' },
  { id: 'reminders', label: 'Reminders', tint: 'butter' },
  { id: 'ideas', label: 'Ideas', tint: 'lavender' },
  { id: 'someday', label: 'Someday', tint: 'sage' },
]

export default function BrainDump() {
  const { braindumps, actions } = useApp()
  const [text, setText] = useState('')
  const [category, setCategory] = useState('ideas')
  const [filter, setFilter] = useState('all')

  const items = useMemo(() => braindumps
    .filter((item) => filter === 'all' || (filter === 'parking' ? item.parking_lot : !item.parking_lot && item.category === filter))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [braindumps, filter])

  const parking = braindumps.filter((item) => item.parking_lot)
  const submit = async (event) => {
    event.preventDefault()
    if (!text.trim()) return
    await actions.createDump({ text: text.trim(), category, parking_lot: false })
    setText('')
  }

  return (
    <div className="stack">
      <SectionHead title="Brain Dump" />

      <section className="panel tint-lavender">
        <form onSubmit={submit}>
          <textarea
            className="textarea" value={text} onChange={(event) => setText(event.target.value)}
            placeholder="What is on your mind? Write it however it comes out…" style={{ minHeight: 110, background: 'var(--surface)' }}
          />
          <div className="row-wrap" style={{ marginTop: 12 }}>
            <span className="small muted">Filed as {CATEGORIES.find((item) => item.id === category)?.label}.</span>
            <span className="spacer" />
            <button className="btn btn-primary" type="submit" disabled={!text.trim()}><Plus size={15} /> Capture</button>
          </div>
          <details className="more-fields">
            <summary>Change category</summary>
            <div className="row-wrap">
              {CATEGORIES.map((item) => (
                <button key={item.id} type="button" className={`chip button ${item.tint} ${category === item.id ? 'selected' : ''}`} onClick={() => setCategory(item.id)}>{item.label}</button>
              ))}
            </div>
          </details>
        </form>
      </section>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(250px, .9fr)', alignItems: 'start' }}>
        <section className="panel">
          <div className="tabs" style={{ marginBottom: 14 }}>
            <button className={cx('tab', filter === 'all' && 'active')} onClick={() => setFilter('all')}>All</button>
            <button className={cx('tab', filter === 'parking' && 'active')} onClick={() => setFilter('parking')}>Parked</button>
            {CATEGORIES.some((item) => item.id === filter)
              && <button className="tab active" title="Show all" onClick={() => setFilter('all')}>{CATEGORIES.find((item) => item.id === filter).label}</button>}
          </div>
          {items.length === 0
            ? <Empty icon={Lightbulb}>A blank page is fine. Thoughts can wait until they arrive.</Empty>
            : items.map((item) => (
              <div key={item.id} className="task-row" style={{ alignItems: 'flex-start' }}>
                <Sparkles size={15} style={{ flex: 'none', marginTop: 4, color: 'var(--muted)' }} />
                <div className="task-main">
                  <div style={{ fontSize: 14, lineHeight: 1.5 }}>{item.text}</div>
                  <div className="task-meta">
                    <span className={`chip ${CATEGORIES.find((cat) => cat.id === item.category)?.tint || ''}`}>{item.category}</span>
                    {item.parking_lot && <span className="chip butter">parked</span>}
                    <span className="chip">{relativeDay(item.created_at)}</span>
                  </div>
                </div>
                <div className="task-actions" style={{ opacity: .7 }}>
                  {!item.converted_task_id && <button className="task-action" title="Turn into a task" onClick={() => actions.convertDump(item.id)}><ArrowRight size={15} /></button>}
                  {!item.parking_lot && <button className="task-action" title="Move to parking lot" onClick={() => actions.updateDump(item.id, { parking_lot: true })}><ParkingCircle size={15} /></button>}
                  <button className="task-action" title="Delete" onClick={() => actions.removeDump(item.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          <details className="more-fields">
            <summary>Filter by label</summary>
            <div className="row-wrap">
              {CATEGORIES.map((item) => (
                <button key={item.id} className={cx('btn btn-sm', filter === item.id ? 'btn-primary' : 'btn-ghost')} onClick={() => setFilter(item.id)}>{item.label}</button>
              ))}
            </div>
          </details>
        </section>

        <details className="more-fields">
          <summary>Parking lot & notes</summary>
          <div className="stack">
            <section className="panel tint-butter">
              <div className="eyebrow">Distraction Parking Lot</div>
              <h3 style={{ marginTop: 6 }}>Park it, don't chase it.</h3>
              {parking.length === 0
                ? <div className="small muted">Nothing parked right now.</div>
                : parking.slice(0, 6).map((item) => (
                  <div key={item.id} className="schedule-card" style={{ marginBottom: 6 }}>
                    <div className="label" style={{ fontWeight: 500 }}>{item.text}</div>
                    <div className="meta">{formatTime(item.created_at)}</div>
                  </div>
                ))}
            </section>
            <section className="panel flat">
              <div className="eyebrow">A note on categories</div>
              <p className="small" style={{ margin: '7px 0 0' }}>Categories are just labels for later. If you are unsure, drop it in Ideas or Someday and move on.</p>
            </section>
          </div>
        </details>
      </div>
    </div>
  )
}
