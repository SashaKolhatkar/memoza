import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Lightbulb, Play, Plus, Sunrise, Trophy,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { breakDownTask } from '../lib/breakdown'
import TaskComposer from '../components/TaskComposer'
import TaskRow from '../components/TaskRow'
import StartAssistPanel from '../components/StartAssistPanel'
import SchedulePanel from '../components/SchedulePanel'
import { RestartButton } from '../components/Layout'
import { formatTime, minutesLabel, relativeDay, todayISO } from '../lib/utils'

export default function Dashboard() {
  const { tasks, blocks, user, sessions, focus, actions, mode, refresh, toast } = useApp()
  const [composer, setComposer] = useState(null)
  const [capture, setCapture] = useState('')

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.status === 'today').sort((a, b) => (b.is_main_priority - a.is_main_priority) || (b.importance - a.importance) || a.position - b.position),
    [tasks],
  )
  const doneToday = tasks.filter((task) => task.status === 'done' && task.completed_at && new Date(task.completed_at).toDateString() === new Date().toDateString())
  const main = todayTasks.find((task) => task.is_main_priority) || todayTasks[0] || null
  const progress = Math.round((doneToday.length / Math.max(1, doneToday.length + todayTasks.length)) * 100)
  const focusMinutes = sessions.filter((session) => session.mode === 'task').reduce((sum, session) => sum + session.actual_minutes, 0)

  const quickAdd = async (event) => {
    event.preventDefault()
    if (!capture.trim()) return
    await actions.createTask({ title: capture.trim(), status: 'today', estimated_minutes: 25 })
    setCapture('')
  }

  return (
    <div>
      <section className="hero">
        <div className="greeting-kicker"><Sunrise size={15} /> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1>Good to see you{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
        <p className="hero-sub">
          {main
            ? <>Today's main priority is <strong style={{ color: 'var(--ink)' }}>{main.title}</strong>. Next: {main.first_action || 'just open it and look.'}</>
            : 'Nothing is demanding your attention. Add one small thing if you would like.'}
        </p>
        <div className="hero-actions">
          {main && (
            <button className="btn btn-primary btn-lg" onClick={() => focus.start({ taskId: main.id, taskTitle: main.title, minutes: 2 })}>
              <Play size={16} fill="currentColor" /> Start for 2 minutes
            </button>
          )}
          <RestartButton />
        </div>
      </section>

      <div className="dash-grid">
        <div className="dash-column">
          <section className="panel">
            <div className="section-head">
              <h2>Today</h2>
              <span className="spacer" />
              <Link className="btn btn-sm btn-quiet" to="/tasks">All tasks <ArrowRight size={14} /></Link>
            </div>
            <form className="quick-capture" onSubmit={quickAdd}>
              <input className="input" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Add one small thing…" />
              <button className="btn btn-soft" type="submit"><Plus size={16} /> Add</button>
            </form>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <Link className="small muted" to="/brain-dump"><Lightbulb size={13} style={{ verticalAlign: -2 }} /> Brain dump instead</Link>
              <span className="small muted">{todayTasks.length} open · {doneToday.length} done</span>
            </div>
            <div style={{ marginTop: 10 }}>
              {todayTasks.length === 0
                ? <div className="empty">Today is clear. You can add something when you feel ready.</div>
                : todayTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} showFirstAction={task.is_main_priority} onEdit={setComposer} />)}
            </div>
            {todayTasks.length > 4 && <Link className="small muted" to="/tasks">See {todayTasks.length - 4} more →</Link>}
          </section>

          <section className="panel">
            <div className="section-head"><h2>Start Assist</h2></div>
            {main
              ? <StartAssistPanel
                  task={main}
                  onBreakDown={async (task) => {
                    await breakDownTask(task, refresh)
                    toast('Broken into three small steps. The original task is safe in Upcoming.', 'gentle')
                  }}
                />
              : <div className="empty">Add a task and we will find the smallest possible first step.</div>}
          </section>
        </div>

        <div className="dash-column">
          <Link to="/progress" className="panel tint-sky" style={{ display: 'block', textDecoration: 'none' }}>
            <div className="row">
              <Trophy size={20} color="var(--sky-deep)" />
              <div style={{ flex: 1 }}>
                <div className="priority-title">Your progress</div>
                <div className="small muted">Daily and monthly quests, made from what you actually did.</div>
              </div>
              <ArrowRight size={16} color="var(--sky-deep)" />
            </div>
          </Link>

          <details className="more-fields">
            <summary>More for today</summary>
            <div className="stack">
              <SchedulePanel day={todayISO()} blocks={blocks} />
              <section className="panel tint-peach">
                <div className="section-head"><h2>Gentle reminders</h2></div>
                <Reminders />
              </section>
              <section className="panel">
                <div className="section-head"><h2>Progress</h2><CheckCircle2 size={18} color="var(--sage-deep)" /></div>
                <div className="mini-stats">
                  <div className="mini-stat"><div className="value">{doneToday.length}</div><div className="label">done today</div></div>
                  <div className="mini-stat"><div className="value">{sessions.filter((s) => s.mode === 'task').length}</div><div className="label">sessions</div></div>
                  <div className="mini-stat"><div className="value">{minutesLabel(focusMinutes)}</div><div className="label">in focus</div></div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Today's movement</span><span className="strong">{progress}%</span></div>
                  <div style={{ marginTop: 7 }}><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></div>
                </div>
                <div className="tiny muted" style={{ marginTop: 10 }}>{mode === 'local' ? 'Saved privately on this device.' : user?.is_demo ? 'Demo workspace — sample data only.' : 'Your data is stored privately.'}</div>
              </section>
            </div>
          </details>
        </div>
      </div>

      <TaskComposer open={!!composer} onClose={() => setComposer(null)} task={composer?.id ? composer : null} />
    </div>
  )
}

function Reminders() {
  const { tasks } = useApp()
  const [items, setItems] = useState([])
  useEffect(() => { api.events.upcoming(4).then(setItems).catch(() => {}) }, [])
  const dueTasks = tasks.filter((task) => task.status !== 'done' && task.due_at).sort((a, b) => new Date(a.due_at) - new Date(b.due_at)).slice(0, 2)
  if (!items.length && !dueTasks.length) {
    return <div className="small muted">Nothing urgent coming up. That is a good moment to breathe.</div>
  }
  return (
    <div>
      {items.map((item) => (
        <div className="reminder-line" key={item.id}>
          <span className="reminder-dot" style={{ background: item.kind === 'deadline' ? 'var(--peach)' : 'var(--sky)' }} />
          <div>
            <div className="strong" style={{ fontSize: 13 }}>{item.title}</div>
            <div className="small muted">{relativeDay(item.at)} · {formatTime(item.at)}{item.prep_minutes ? ` · allow ${item.prep_minutes} min to prepare` : ''}</div>
          </div>
        </div>
      ))}
      {dueTasks.map((task) => (
        <div className="reminder-line" key={task.id}>
          <span className="reminder-dot" style={{ background: 'var(--butter)' }} />
          <div>
            <div className="strong" style={{ fontSize: 13 }}>{task.title}</div>
            <div className="small muted">Task deadline · {relativeDay(task.due_at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
