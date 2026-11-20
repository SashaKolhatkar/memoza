import { useState } from 'react'
import {
  CalendarClock, Check, ChevronDown, Clock3, Copy, MoreHorizontal, Pause,
  Pencil, Play, Scissors, Shrink, Sparkles, Trash2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { cx, minutesLabel, relativeDay } from '../lib/utils'

export default function TaskRow({ task, showFirstAction = false, onEdit, compact = false }) {
  const { actions, focus, timer } = useApp()
  const [menu, setMenu] = useState(false)
  const [targetDate, setTargetDate] = useState('')
  const isDone = task.status === 'done'
  const isActive = timer?.taskId === task.id && timer?.running
  const isMissed = task.scheduled_start && new Date(task.scheduled_start) < new Date() && !isDone

  const handleMissed = async (action, date) => {
    await actions.handleMissed(task.id, { action, target_date: date || undefined })
    setMenu(false)
  }

  return (
    <div className={cx('task-row', isDone && 'done')}>
      <button
        className={cx('task-check', isDone && 'checked')}
        onClick={() => isDone ? actions.updateTask(task.id, { status: 'today' }) : actions.completeTask(task.id)}
        title={isDone ? 'Mark as not done' : 'Mark done'}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <div className="task-main">
        <div className="task-title" onClick={() => onEdit?.(task)} style={{ cursor: onEdit ? 'pointer' : 'default' }}>{task.title}</div>
        {showFirstAction && task.first_action && !isDone && (
          <div className="small muted" style={{ marginTop: 4, display: 'flex', gap: 5, alignItems: 'flex-start' }}>
            <Sparkles size={13} style={{ flex: 'none', marginTop: 3, color: 'var(--butter-deep)' }} />
            <span>{task.first_action}</span>
          </div>
        )}
        <div className="task-meta">
          {task.due_at && <span className={cx('chip', isMissed ? '' : 'peach')}>{relativeDay(task.due_at)}</span>}
          {isMissed && <span className="chip butter">time passed</span>}
          {task.is_main_priority && <span className="chip butter">one priority</span>}
          {task.estimated_minutes > 0 && <span className="chip"><Clock3 size={11} /> {minutesLabel(task.estimated_minutes)}</span>}
        </div>
        {menu && (
          <div className="panel flat" style={{ marginTop: 10, padding: 10, background: 'var(--surface-2)' }}>
            <div className="tiny muted" style={{ marginBottom: 7 }}>
              {isMissed ? 'That time passed. Only this task changes.' : 'Only this task changes.'}
            </div>
            <div className="row-wrap">
              <button className="btn btn-sm btn-ghost" onClick={() => handleMissed('reschedule')}><CalendarClock size={13} /> Reschedule</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleMissed('break_down')}><Scissors size={13} /> Break into smaller tasks</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleMissed('reduce_scope')}><Shrink size={13} /> Reduce scope</button>
              <button className="btn btn-sm btn-ghost" onClick={() => handleMissed('remove')}><Copy size={13} /> Remove from active list</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input className="input" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} style={{ maxWidth: 170 }} />
              <button className="btn btn-sm btn-soft" onClick={() => handleMissed('move_to_another_day', targetDate)}>Move to this day</button>
            </div>
          </div>
        )}
      </div>
      {!isDone && !compact && (
        <div className="task-actions">
          <button className="task-action" title={isActive ? 'Pause focus' : 'Start focus'} onClick={() => {
            if (isActive) focus.pause()
            else if (timer?.taskId === task.id) focus.resume()
            else focus.start({ taskId: task.id, taskTitle: task.title, minutes: Math.min(task.estimated_minutes || 25, 50) })
          }}>
            {isActive ? <Pause size={15} /> : <Play size={15} />}
          </button>
          {onEdit && <button className="task-action" title="Edit" onClick={() => onEdit(task)}><Pencil size={15} /></button>}
          <button className="task-action" title="More options" onClick={() => setMenu((value) => !value)}><MoreHorizontal size={16} /></button>
        </div>
      )}
      {isDone && !compact && <button className="task-action" title="Remove" onClick={() => actions.removeTask(task.id)}><Trash2 size={14} /></button>}
      {menu && <button className="task-action" onClick={() => setMenu(false)} title="Close options"><ChevronDown size={15} style={{ transform: 'rotate(180deg)' }} /></button>}
    </div>
  )
}
