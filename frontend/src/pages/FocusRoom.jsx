import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Check, Clock3, Coffee, Lightbulb, Lock, NotebookPen, Pause, Play,
  Plus, Sparkles, Unlock, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { Switch, TimeRing, formatClock } from '../components/ui'
import { RestartButton } from '../components/Layout'
import MusicPicker from '../components/MusicPicker'
import MusicPlayer from '../components/MusicPlayer'
import { minutesLabel, relativeDay } from '../lib/utils'

export default function FocusRoom() {
  const { tasks, sessions, focus, timer, preferences, setPreference, setNotificationPreference, insights, toast } = useApp()
  const navigate = useNavigate()
  const [minutes, setMinutes] = useState(preferences.defaultSessionMinutes || 25)
  const [taskId, setTaskId] = useState('')
  const [lockLength, setLockLength] = useState(false)
  const [distraction, setDistraction] = useState('')
  const [accomplished, setAccomplished] = useState('')
  const [notes, setNotes] = useState('')
  const [actual, setActual] = useState('')
  const [showFinish, setShowFinish] = useState(false)
  const [logMinutes, setLogMinutes] = useState('')
  const [logTaskId, setLogTaskId] = useState('')
  const [prediction, setPrediction] = useState(null)
  const [predicting, setPredicting] = useState(false)

  useEffect(() => {
    document.body.classList.add('immersive')
    return () => document.body.classList.remove('immersive')
  }, [])

  useEffect(() => {
    if (!timer) {
      setAccomplished(''); setNotes(''); setActual(''); setShowFinish(false)
    }
  }, [timer])

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done' && task.status !== 'archived'),
    [tasks],
  )
  const task = openTasks.find((item) => item.id === (timer?.taskId || taskId))
  const selected = openTasks.find((item) => item.id === (taskId || timer?.taskId))
  const nextAction = task?.first_action || 'Notice one thing you can do in the next two minutes.'
  const recent = sessions.filter((session) => session.mode === 'task' && session.actual_minutes > 0).slice(0, 5)

  const start = (mode = 'task', length = minutes) => {
    focus.start({
      taskId: mode === 'task' ? (taskId || null) : null,
      taskTitle: task?.title || 'Open focus session',
      minutes: length,
      mode,
    })
    setAccomplished(''); setNotes(''); setActual(''); setShowFinish(false)
  }

  // An open session is a stopwatch: no goal, no countdown — just count up from zero.
  const startOpen = () => focus.start({
    taskId: null,
    taskTitle: 'Open session',
    minutes,
    mode: 'task',
    countUp: true,
  })

  const finish = async () => {
    await focus.finish({
      accomplished,
      notes,
      actualMinutes: actual ? Number(actual) : undefined,
      completed: true,
    })
  }

  const logTime = async (event) => {
    event.preventDefault()
    const saved = await focus.logManual({ taskId: logTaskId || null, minutes: logMinutes })
    if (saved) setLogMinutes('')
  }

  const predict = async () => {
    setPredicting(true)
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
    } finally { setPredicting(false) }
  }

  return (
    <div className="stack">
      <div className="focus-room">
        <div className="focus-top">
          <button className="icon-btn" onClick={() => navigate('/')} title="Back to today"><ArrowLeft size={17} /></button>
          <div className="eyebrow">Focus · one clock for your day</div>
          <span className="spacer" />
          <RestartButton compact />
          {timer && <button className="icon-btn plain" onClick={focus.discard} title="Close session"><X size={18} /></button>}
        </div>

        <div className="focus-stage">
          <div className="focus-task-label">
            {timer ? (timer.mode === 'task' ? (timer.taskTitle || 'Open focus session') : 'A gentle break') : 'What are you giving your attention to?'}
          </div>
          <div className="focus-next">
            {timer
              ? (timer.countUp
                ? 'Counting up from zero. Save whenever you are ready.'
                : (timer.mode === 'task' ? `Next tiny action: ${nextAction}` : 'Let your shoulders drop. Nothing is required.'))
              : 'Choose a task, or simply begin with a short block of time.'}
          </div>

          <TimeRing remaining={timer?.remaining ?? minutes * 60} total={(timer?.plannedMinutes ?? minutes) * 60} mode={timer?.mode || 'task'}>
            <div className="timer-digits">{formatClock(timer?.remaining ?? minutes * 60)}</div>
            <div className="timer-label">{timer ? (timer.countUp ? 'counting up' : timer.mode === 'task' ? 'focus' : 'break') : 'ready'}</div>
          </TimeRing>

          {!timer ? (
            <>
              <div className="focus-controls">
                {[2, 5, 25].map((value) => (
                  <button
                    key={value}
                    className={`chip button ${minutes === value ? 'lavender selected' : ''}`}
                    disabled={lockLength}
                    onClick={() => setMinutes(value)}
                  >{value}m</button>
                ))}
                <input
                  className="input" style={{ width: 84, textAlign: 'center' }} type="number" min="1" max="240"
                  value={minutes} disabled={lockLength} aria-label="Session length in minutes"
                  onChange={(event) => setMinutes(Math.max(1, Math.min(240, Number(event.target.value) || 1)))}
                />
                <button
                  className={`chip button ${lockLength ? 'lavender selected' : ''}`}
                  onClick={() => setLockLength((value) => !value)}
                  title={lockLength ? 'Unlock the session length' : 'Keep this length fixed'}
                >
                  {lockLength ? <Lock size={13} /> : <Unlock size={13} />}
                  {lockLength ? 'Locked' : 'Lock length'}
                </button>
              </div>
              {openTasks.length > 0 && (
                <select className="select" style={{ maxWidth: 420 }} value={taskId} onChange={(event) => setTaskId(event.target.value)}>
                  <option value="">No specific task</option>
                  {openTasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              )}
              <div className="focus-controls">
                <button className="btn btn-primary btn-lg" onClick={() => start('task', minutes)}><Play size={16} fill="currentColor" /> Begin focus</button>
                <button className="btn btn-ghost" onClick={startOpen}>Open session · counts up from zero</button>
              </div>
              <details className="more-fields">
                <summary>Breaks</summary>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-ghost" onClick={() => start('break', 10)}><Coffee size={16} /> 10-minute break</button>
                  <button className="btn btn-ghost" onClick={() => start('breather', 5)}><Sparkles size={16} /> 5-minute breather</button>
                </div>
              </details>
              <details className="more-fields music-details">
                <summary>Optional background music{preferences.musicEnabled ? ' · on' : ''}</summary>
                <MusicPicker compact />
              </details>
            </>
          ) : (
            <>
              <div className="focus-controls">
                {timer.running
                  ? <button className="btn btn-soft btn-lg" onClick={focus.pause}><Pause size={16} /> Pause</button>
                  : <button className="btn btn-primary btn-lg" onClick={focus.resume}><Play size={16} fill="currentColor" /> Resume</button>}
                {!timer.countUp && <button className="btn btn-ghost" onClick={() => focus.addMinutes(5)}><Plus size={15} /> 5 more minutes</button>}
                <button className="btn btn-ghost" onClick={() => setShowFinish((value) => !value)}><Check size={15} /> Finish & save</button>
              </div>
              {showFinish && (
                <div className="panel flat" style={{ maxWidth: 520, marginTop: 12, textAlign: 'left' }}>
                  <input className="input" value={accomplished} onChange={(event) => setAccomplished(event.target.value)} placeholder="What did you get done? (optional)" />
                  <div className="row" style={{ marginTop: 9 }}>
                    <input className="input" type="number" min="0" max="480" value={actual} onChange={(event) => setActual(event.target.value)} placeholder={timer.countUp ? String(Math.max(1, Math.round(timer.remaining / 60))) : String(Math.round(timer.plannedMinutes))} />
                    <span className="small muted">minutes it really took</span>
                  </div>
                  <textarea className="textarea" style={{ marginTop: 9, minHeight: 64 }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for later you…" />
                  <button className="btn btn-primary btn-sm btn-full" style={{ marginTop: 9 }} onClick={finish}><Check size={14} /> Save session</button>
                </div>
              )}
            </>
          )}
        </div>

        {timer && (
          <div className="focus-side">
            <MusicPlayer />

            <section className="panel flat">
              <div className="row">
                <Lightbulb size={17} color="var(--butter-deep)" />
                <strong className="small">Distraction parking lot</strong>
              </div>
              <form className="row" onSubmit={async (event) => {
                event.preventDefault()
                if (!distraction.trim()) return
                await focus.addDistraction(distraction.trim())
                setDistraction('')
              }}>
                <input className="input" value={distraction} onChange={(event) => setDistraction(event.target.value)} placeholder="A thought to park…" />
                <button className="btn btn-sm btn-soft" type="submit" disabled={!distraction.trim()}><Plus size={14} /> Park</button>
              </form>
              {timer.distractions?.length > 0 && <div className="tiny muted" style={{ marginTop: 8 }}>{timer.distractions.length} thought(s) parked safely.</div>}
            </section>

            <section className="panel flat">
              <div className="row"><NotebookPen size={17} color="var(--lavender-deep)" /><strong className="small">Quick notes</strong></div>
              <textarea className="textarea" style={{ marginTop: 9, minHeight: 64 }} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for later you…" />
              <div className="tiny muted" style={{ marginTop: 6 }}>Saved with the session when you finish.</div>
            </section>
          </div>
        )}
      </div>

      <section className="panel tint-sky">
        <div className="section-head"><h2>Already finished something?</h2><Clock3 size={17} color="var(--sky-deep)" /></div>
        <p className="small muted" style={{ margin: '0 0 10px' }}>No clock needed — just record the time it took.</p>
        <form className="row-wrap" onSubmit={logTime}>
          <select className="select" style={{ maxWidth: 260 }} value={logTaskId} onChange={(event) => setLogTaskId(event.target.value)}>
            <option value="">No specific task</option>
            {openTasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <input className="input" style={{ width: 96 }} type="number" min="1" max="480" value={logMinutes} onChange={(event) => setLogMinutes(event.target.value)} placeholder="minutes" aria-label="Minutes spent" />
          <button className="btn btn-soft" type="submit" disabled={!Number(logMinutes) || Number(logMinutes) <= 0}><Check size={15} /> Log time</button>
        </form>
      </section>

      <details className="more-fields">
        <summary>Estimates, reminders & recent sessions</summary>
        <div className="stack">
          <section className="panel">
            <div className="section-head"><h2>Duration guess</h2><Sparkles size={17} color="var(--sky-deep)" /></div>
            <button className="btn btn-sm btn-soft" onClick={predict} disabled={predicting}>{predicting ? 'Looking…' : 'Estimate this task'}</button>
            {prediction && (
              <div className="panel flat" style={{ marginTop: 11, padding: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="display" style={{ fontSize: 30 }}>{minutesLabel(prediction.minutes)}</span>
                  <span className={`chip ${prediction.source === 'model_prediction' ? 'sage' : 'butter'}`}>
                    {prediction.source === 'model_prediction' ? 'personal model' : 'rule-based'}
                  </span>
                </div>
                <p className="small" style={{ margin: '6px 0 0' }}>{prediction.basis}</p>
              </div>
            )}
            <div className="tiny muted" style={{ marginTop: 10 }}>{insights?.model_status?.message}</div>
          </section>

          <section className="panel">
            <div className="eyebrow">Gentle reminders</div>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              <Switch checked={!!preferences.gentleReminders} onChange={(value) => setPreference('gentleReminders', value)} label="Time check-ins" />
              <Switch checked={!!preferences.breakReminders} onChange={(value) => setPreference('breakReminders', value)} label="Break suggestions" />
              <Switch checked={!!preferences.notificationPreferences?.sound} onChange={(value) => setNotificationPreference('sound', value)} label="Soft sound at session end" />
            </div>
          </section>

          <section className="panel">
            <div className="section-head"><h2>Recent sessions</h2></div>
            {recent.length === 0
              ? <div className="small muted">No recorded sessions yet.</div>
              : recent.map((session) => (
                <div key={session.id} className="task-row" style={{ alignItems: 'center' }}>
                  <Clock3 size={15} color="var(--muted)" />
                  <div className="task-main">
                    <div className="task-title">{tasks.find((item) => item.id === session.task_id)?.title || 'Open focus session'}</div>
                    <div className="small muted">{relativeDay(session.ended_at || session.started_at)} · {minutesLabel(session.actual_minutes)}</div>
                  </div>
                </div>
              ))}
          </section>
        </div>
      </details>
    </div>
  )
}
