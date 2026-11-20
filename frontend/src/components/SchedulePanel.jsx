import { useState } from 'react'
import { CalendarClock, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { cx, formatTime, minutesLabel } from '../lib/utils'
import { Empty, Modal, SectionHead } from './ui'

export function ScheduleList({ blocks, emptyText = 'Nothing scheduled yet. A flexible plan is one click away.' }) {
  if (!blocks?.length) return <Empty icon={CalendarClock}>{emptyText}</Empty>
  return (
    <div className="schedule-list">
      {blocks.map((block) => (
        <div className="schedule-item" key={block.id || `${block.start_at}-${block.label}`}>
          <div className="schedule-time">{formatTime(block.start_at)}</div>
          <div className={cx('schedule-body', block.kind)}>
            <div className="schedule-card">
              <div className="label">{block.label}</div>
              <div className="meta">
                {formatTime(block.start_at)} – {formatTime(block.end_at)}
                {' · '}{minutesLabel((new Date(block.end_at) - new Date(block.start_at)) / 60000)}
                {block.reason ? ` · ${block.reason}` : ''}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ScheduleModal({ open, onClose, day }) {
  const { actions, toast } = useApp()
  const [settings, setSettings] = useState({
    day, energy: 'medium', available_start: '09:00', available_end: '18:00',
    buffer_minutes: 10, break_minutes: 10, max_focus_block: 50,
  })
  const [proposal, setProposal] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)

  const preview = async () => {
    setLoading(true)
    try {
      const result = await api.schedule.preview(settings)
      setProposal(result)
      setSelected(result.blocks.map((_, index) => index))
    } catch (error) { toast(error.message, 'warn') } finally { setLoading(false) }
  }

  const apply = async () => {
    if (!proposal) return
    await actions.applySchedule({
      generation_id: proposal.generation_id, day: proposal.day,
      blocks: selected.map((index) => {
        const block = proposal.blocks[index]
        return {
          task_id: block.task_id, kind: block.kind, label: block.label,
          start_at: block.start_at, end_at: block.end_at, reason: block.reason || '',
        }
      }),
      apply_task_times: true,
    })
    onClose()
  }

  return (
    <Modal
      open={open} onClose={onClose} wide
      title="Reorganize today"
      subtitle="A suggestion, not a decision. Unfinished tasks are never moved automatically."
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={apply} disabled={!proposal || !selected.length}><CalendarClock size={15} /> Apply selected blocks</button>
      </>}
    >
      <div className="grid-3">
        <div className="field"><label>Day</label><input className="input" type="date" value={settings.day} onChange={(event) => setSettings({ ...settings, day: event.target.value })} /></div>
        <div className="field"><label>From</label><input className="input" type="time" value={settings.available_start} onChange={(event) => setSettings({ ...settings, available_start: event.target.value })} /></div>
        <div className="field"><label>Until</label><input className="input" type="time" value={settings.available_end} onChange={(event) => setSettings({ ...settings, available_end: event.target.value })} /></div>
      </div>
      <details className="more-fields">
        <summary>More options</summary>
        <div className="grid-3">
          <div className="field"><label>Energy</label><select className="select" value={settings.energy} onChange={(event) => setSettings({ ...settings, energy: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
          <div className="field"><label>Buffer between blocks</label><select className="select" value={settings.buffer_minutes} onChange={(event) => setSettings({ ...settings, buffer_minutes: Number(event.target.value) })}><option value={0}>None</option><option value={5}>5 min</option><option value={10}>10 min</option><option value={20}>20 min</option></select></div>
          <div className="field"><label>Break after each block</label><select className="select" value={settings.break_minutes} onChange={(event) => setSettings({ ...settings, break_minutes: Number(event.target.value) })}><option value={0}>None</option><option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option></select></div>
        </div>
      </details>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn btn-soft" onClick={preview} disabled={loading}><Sparkles size={15} /> {loading ? 'Looking…' : 'Show a flexible plan'}</button>
        <span className="spacer" />
        <button className="btn btn-sm btn-ghost" onClick={async () => { await actions.clearBlocks(settings.day); setProposal(null) }}><Trash2 size={14} /> Clear this day's blocks</button>
      </div>
      {proposal && (
        <div style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small muted">{proposal.summary.scheduled_count} task block(s) · ~{proposal.summary.focus_minutes} min focus · deliberately under-booked</div>
            <button className="btn btn-sm btn-quiet" onClick={() => setSelected(proposal.blocks.map((_, index) => index))}>Select all</button>
          </div>
          {proposal.blocks.map((block, index) => (
            <label key={index} className={cx('preview-block', block.kind)} style={{ alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(index)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, index] : current.filter((item) => item !== index))} />
              <span className="kind" />
              <span style={{ flex: 1 }}>
                <strong>{formatTime(block.start_at)} · {block.label}</strong>
                <div className="reason">{block.reason}</div>
              </span>
            </label>
          ))}
          {(proposal.unscheduled.length > 0 || proposal.notes.length > 0) && (
            <details className="more-fields">
              <summary>Notes & untouched tasks</summary>
              <div className="stack">
                {proposal.unscheduled.length > 0 && (
                  <div className="panel flat" style={{ padding: 12 }}>
                    <div className="small strong">Left as they are ({proposal.unscheduled.length})</div>
                    {proposal.unscheduled.map((item) => <div key={item.task_id} className="small muted">· {item.title}</div>)}
                  </div>
                )}
                {proposal.notes.map((note, index) => <div key={index} className="tiny muted">{note}</div>)}
              </div>
            </details>
          )}
        </div>
      )}
    </Modal>
  )
}

export default function SchedulePanel({ day, blocks }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="panel">
      <SectionHead
        title="Flexible schedule"
        actions={<button className="btn btn-sm btn-soft" onClick={() => setOpen(true)}><RefreshCw size={14} /> Reorganize</button>}
      />
      <ScheduleList blocks={blocks} />
      <ScheduleModal open={open} onClose={() => setOpen(false)} day={day} />
    </section>
  )
}
