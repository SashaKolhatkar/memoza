import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { BellRing, Clock3, Coffee, Pause, Play, Plus, RotateCcw, Sparkles, Square } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Empty, SectionHead, Switch, TimeRing, formatClock } from '../components/ui'
import { formatDate, minutesLabel } from '../lib/utils'

export default function TimeCompass() {
  const { tasks, sessions, focus, timer, preferences, setPreference, setNotificationPreference, insights, refreshInsights, toast } = useApp()
  const [minutes, setMinutes] = useState(preferences.defaultSessionMinutes || 25)
  const [taskId, setTaskId] = useState('')
  const [accomplished, setAccomplished] = useState('')
  const [notes, setNotes] = useState('')
  const [actual, setActual] = useState('')
  const [prediction, setPrediction] = useState(null)
  const [predictLoading, setPredictLoading] = useState(false)

  const openTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'archived')
  const selected = openTasks.find((task) => task.id === taskId)
  const history = useMemo(() => insights?.duration_history || [], [insights])
  const finishedSessions = sessions.filter((session) => session.mode === 'task' && session.actual_minutes > 0).slice(0, 8)

  useEffect(() => {
    if (!timer) { setAccomplished(''); setNotes(''); setActual('') }
  }, [timer])

  const predict = async () => {
    setPredictLoading(true)
    try {
      setPrediction(await api.insights.predict({
        title: selected?.title || 'A focused work block',
        category: selected?.category || 'general',
        importance: selected?.importance || 3,
        difficulty_reason: selected?.difficulty_reason || null,
        energy: selected?.energy || 'medium',
        rough_mode: selected?.rough_mode || 'off',
      }))
    } catch (error) {
      toast(`Could not make an estimate right now: ${error.message}`, 'warn')
    } finally { setPredictLoading(false) }
  }

  const finish = async () => {
    await focus.finish({
      accomplished, notes,
      actualMinutes: actual ? Number(actual) : undefined,
      completed: true,
    })
    await refreshInsights()
  }

  return (
    <div className="stack">
      <SectionHead title="Time Compass" />

      <section className="panel">
        <div className="eyebrow">{timer ? (timer.mode === 'task' ? 'Focus session' : 'Gentle break') : 'Set your session'}</div>
        <div className="timer-wrap">
          <TimeRing remaining={timer?.remaining ?? minutes * 60} total={(timer?.plannedMinutes ?? minutes) * 60} mode={timer?.mode || 'task'}>
            <div className="timer-digits">{formatClock(timer?.remaining ?? minutes * 60)}</div>
            <div className="timer-label">{timer ? timer.mode === 'task' ? 'focusing' : 'resting' : 'ready when you are'}</div>
          </TimeRing>
        </div>

        {!timer ? (
          <>
            <div className="row-wrap" style={{ justifyContent: 'center' }}>
              {[2, 5, 25].map((value) => (
                <button key={value} className={`chip button ${minutes === value ? 'lavender selected' : ''}`} onClick={() => setMinutes(value)}>{value} min</button>
              ))}
            </div>
            <select className="select" value={taskId} onChange={(event) => setTaskId(event.target.value)} style={{ marginTop: 12 }}>
              <option value="">No specific task</option>
              {openTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-primary btn-full" onClick={() => focus.start({ taskId: taskId || null, taskTitle: selected?.title || 'Open focus session', minutes, mode: 'task' })}>
                <Play size={16} fill="currentColor" /> Start session
              </button>
              <button className="btn btn-ghost" title="Start a 10 minute break" onClick={() => focus.start({ minutes: 10, mode: 'break', label: 'Break' })}><Coffee size={16} /> Break</button>
            </div>
            <details className="more-fields">
              <summary>More options</summary>
              <div className="row" style={{ marginTop: 10 }}>
                <input className="input" type="number" min="1" max="240" value={minutes} onChange={(event) => setMinutes(Math.max(1, Math.min(240, Number(event.target.value) || 1)))} />
                <span className="small muted">custom minutes</span>
              </div>
            </details>
          </>
        ) : (
          <>
            <div className="focus-controls" style={{ marginTop: 6 }}>
              {timer.running
                ? <button className="btn btn-soft" onClick={focus.pause}><Pause size={15} /> Pause</button>
                : <button className="btn btn-primary" onClick={focus.resume}><Play size={15} /> Resume</button>}
              <button className="btn btn-ghost" onClick={() => focus.addMinutes(5)}><Plus size={15} /> 5 more minutes</button>
              <button className="btn btn-ghost" onClick={focus.discard}>Discard</button>
            </div>
            <div className="divider" />
            <input className="input" value={accomplished} onChange={(event) => setAccomplished(event.target.value)} placeholder="What did you get done?" />
            <div className="row" style={{ marginTop: 9 }}>
              <input className="input" type="number" min="0" max="480" value={actual} onChange={(event) => setActual(event.target.value)} placeholder={String(Math.round(timer.plannedMinutes))} />
              <span className="small muted">minutes it really took</span>
            </div>
            <details className="more-fields">
              <summary>Session notes</summary>
              <textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything worth remembering (optional)" style={{ marginTop: 9, minHeight: 68 }} />
            </details>
            <button className="btn btn-primary btn-full" style={{ marginTop: 10 }} onClick={finish}><Square size={14} fill="currentColor" /> Finish & record</button>
          </>
        )}
      </section>

      <details className="more-fields">
        <summary>Estimates, reminders & history</summary>
        <div className="stack">
          <section className="panel tint-sky">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="eyebrow">Duration guess</div>
              <Sparkles size={17} color="var(--sky-deep)" />
            </div>
            <button className="btn btn-sm btn-soft" style={{ marginTop: 10 }} onClick={predict} disabled={predictLoading}>{predictLoading ? 'Looking…' : 'Estimate this task'}</button>
            {prediction && (
              <div className="panel flat" style={{ marginTop: 12, padding: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="display" style={{ fontSize: 32 }}>{minutesLabel(prediction.minutes)}</span>
                  <span className={`chip ${prediction.source === 'model_prediction' ? 'sage' : 'butter'}`}>
                    {prediction.source === 'model_prediction' ? 'personal model' : 'rule-based'}
                  </span>
                </div>
                <p className="small" style={{ margin: '6px 0 0' }}>{prediction.basis}</p>
                <div className="tiny muted" style={{ marginTop: 6 }}>Confidence: {prediction.confidence} · {prediction.training_samples} personal records</div>
              </div>
            )}
            <div className="tiny muted" style={{ marginTop: 10 }}>{insights?.model_status?.message}</div>
          </section>

          <section className="panel">
            <div className="eyebrow">Gentle reminders</div>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              <Switch checked={!!preferences.gentleReminders} onChange={(value) => setPreference('gentleReminders', value)} label="Time check-ins" />
              <Switch checked={!!preferences.breakReminders} onChange={(value) => setPreference('breakReminders', value)} label="Break suggestions" />
              <Switch checked={!!preferences.notificationPreferences?.sound} onChange={(value) => setNotificationPreference('sound', value)} label="Soft sound" />
            </div>
          </section>

          <section className="panel">
            <SectionHead title="Duration history" />
            {history.length === 0
              ? <Empty icon={Clock3}>Record a session and its actual duration to see your history here.</Empty>
              : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(value) => value.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="planned" name="Planned" fill="var(--lavender)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="actual" name="Actual" fill="var(--sage)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
          </section>

          <section className="panel">
            <SectionHead title="Recent sessions" />
            {finishedSessions.length === 0
              ? <Empty icon={RotateCcw}>No sessions recorded yet.</Empty>
              : finishedSessions.map((session) => {
                const task = tasks.find((item) => item.id === session.task_id)
                return (
                  <div key={session.id} className="task-row" style={{ alignItems: 'center' }}>
                    <Clock3 size={16} color="var(--muted)" />
                    <div className="task-main">
                      <div className="task-title">{task?.title || 'Open focus session'}</div>
                      <div className="small muted">{formatDate(session.ended_at || session.started_at)} · planned {minutesLabel(session.planned_minutes)} · actual {minutesLabel(session.actual_minutes)}</div>
                    </div>
                    {session.accomplished && <span className="chip sage">{session.accomplished.slice(0, 40)}</span>}
                    {session.actual_minutes > session.planned_minutes && <BellRing size={14} color="var(--butter-deep)" />}
                  </div>
                )
              })}
          </section>
        </div>
      </details>
    </div>
  )
}
