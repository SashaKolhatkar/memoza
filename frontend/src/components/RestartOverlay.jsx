import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, ArrowRight, CalendarClock, Check, ChevronLeft, Clock3, Coffee,
  Compass, ListChecks, PartyPopper, Sparkles, Target, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { celebrate } from '../lib/celebrate'
import { tomorrowISO, todayISO } from '../lib/utils'
import ChibiCompanion, { buddyNameFor } from './ChibiCompanion'
import { formatClock } from './ui'

// tomorrowISO lives in utils; keep this module resilient if it is not exported yet.
const nextDay = typeof tomorrowISO === 'function' ? tomorrowISO : () => todayISO()

const OPTIONS = [
  {
    id: 'rebuild', label: 'Rebuild my day', icon: CalendarClock,
    description: 'Make a simple plan for the hours left.', tint: 'tint-lavender',
  },
  {
    id: 'priority', label: 'Choose one priority', icon: Target,
    description: 'Find the one thing that matters most.', tint: 'tint-peach',
  },
  {
    id: 'started', label: 'Help me get started', icon: Sparkles,
    description: 'Show me one tiny first step.', tint: 'tint-sage',
  },
  {
    id: 'breather', label: 'Take a breather', icon: Coffee,
    description: 'A short break. Nothing to achieve.', tint: 'tint-butter',
  },
]

function defaultWindow() {
  const now = new Date()
  const current = now.getHours() * 60 + now.getMinutes()
  if (current >= 20 * 60) return { day: nextDay(), start: '09:00', end: '18:00' }
  const rounded = Math.max(9 * 60, Math.ceil((current + 5) / 15) * 15)
  return {
    day: todayISO(),
    start: `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`,
    end: '20:00',
  }
}

export default function RestartOverlay() {
  const { restartOpen, setRestartOpen, toast, actions, focus, timer, tasks, preferences } = useApp()
  const [step, setStep] = useState('menu')
  const [loading, setLoading] = useState(false)
  const [window_, setWindow] = useState(defaultWindow)
  const [energy, setEnergy] = useState('medium')
  const [proposal, setProposal] = useState(null)
  const [selected, setSelected] = useState([])
  const [priorities, setPriorities] = useState([])
  const [chosen, setChosen] = useState(null)
  const [starter, setStarter] = useState(null)

  useEffect(() => {
    if (!restartOpen) return undefined
    setStep('menu')
    setProposal(null)
    setPriorities([])
    setChosen(null)
    setStarter(null)
    setWindow(defaultWindow())
    const onKeyDown = (event) => { if (event.key === 'Escape') setRestartOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [restartOpen, setRestartOpen])

  useEffect(() => {
    if (!restartOpen || step !== 'breather' || timer) return
    focus.start({ minutes: 5, mode: 'breather', label: 'A quiet breather' })
  }, [restartOpen, step, timer, focus])

  const close = () => setRestartOpen(false)
  const buddyName = buddyNameFor('down', preferences.buddyName, preferences.buddyCharacter)
  const buddyCharacter = preferences.buddyCharacter || 'auto'
  const buddyColor = preferences.buddyColor || 'default'

  const loadProposal = async () => {
    setLoading(true)
    try {
      const result = await api.restart.rebuild({
        day: window_.day, energy, available_start: window_.start, available_end: window_.end,
      })
      setProposal(result)
      setSelected(result.blocks.map((_, index) => index))
    } catch (error) { toast(error.message, 'warn') } finally { setLoading(false) }
  }

  const applyProposal = async () => {
    if (!proposal) return
    setLoading(true)
    try {
      const blockPayload = selected.map((index) => {
        const block = proposal.blocks[index]
        return {
          task_id: block.task_id, kind: block.kind, label: block.label,
          start_at: block.start_at, end_at: block.end_at, reason: block.reason || '',
        }
      })
      await actions.applySchedule({ generation_id: proposal.generation_id, day: proposal.day, blocks: blockPayload, apply_task_times: true })
      close()
    } catch (error) { toast(error.message, 'warn') } finally { setLoading(false) }
  }

  const loadPriorities = async () => {
    setLoading(true)
    try { setPriorities(await api.restart.priorities(3)) }
    catch (error) { toast(error.message, 'warn') } finally { setLoading(false) }
  }

  const loadStarter = async (taskId) => {
    setLoading(true)
    try { setStarter(await api.restart.getStarted(taskId)) }
    catch (error) { toast(error.message, 'warn') } finally { setLoading(false) }
  }

  const menu = () => (
    <>
      <div className="restart-head">
        <div style={{ marginBottom: 4 }}><ChibiCompanion mood="down" color={buddyColor} character={buddyCharacter} name={buddyName} size={92} /></div>
        <div className="tiny muted" style={{ marginBottom: 6 }}>{buddyName} is here with you</div>
        <div className="eyebrow">A gentle reset</div>
        <h2>It's okay. You can start again.</h2>
        <p>Nothing is lost or moved. Pick what helps — or just close this and breathe.</p>
      </div>
      <div className="restart-options">
        {OPTIONS.map((option) => {
          const Icon = option.icon
          return (
            <button key={option.id} className={`restart-option ${option.tint}`} onClick={() => {
              celebrate('restart')
              setStep(option.id)
              if (option.id === 'rebuild') loadProposal()
              if (option.id === 'priority') loadPriorities()
              if (option.id === 'started') loadStarter()
            }}>
              <span className="opt-icon" style={{ background: 'var(--surface)' }}><Icon size={19} color="var(--lavender-deep)" /></span>
              <span className="opt-title">{option.label}</span>
              <span className="opt-desc">{option.description}</span>
            </button>
          )
        })}
      </div>
      <div className="restart-foot">Your tasks stay where they are. You decide what happens next.</div>
    </>
  )

  const header = (title, subtitle) => (
    <div className="restart-step-head">
      <button className="icon-btn" onClick={() => setStep('menu')} aria-label="Back"><ChevronLeft size={17} /></button>
      <div>
        <div className="eyebrow">Restart · one small decision</div>
        <h2 style={{ margin: 0, fontSize: 24 }}>{title}</h2>
        {subtitle && <p className="small" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
    </div>
  )

  const rebuild = () => (
    <div className="restart-step">
      {header('Rebuild my day', 'A simple plan for the hours ahead. Only what you pick is applied.')}
      <div className="grid-3">
        <div className="field">
          <label>Day</label>
          <input className="input" type="date" value={window_.day} onChange={(event) => setWindow({ ...window_, day: event.target.value })} />
        </div>
        <div className="field">
          <label>From</label>
          <input className="input" type="time" value={window_.start} onChange={(event) => setWindow({ ...window_, start: event.target.value })} />
        </div>
        <div className="field">
          <label>Until</label>
          <input className="input" type="time" value={window_.end} onChange={(event) => setWindow({ ...window_, end: event.target.value })} />
        </div>
      </div>
      <div className="row-wrap" style={{ marginTop: 12 }}>
        <span className="small muted">Energy right now:</span>
        {['low', 'medium', 'high'].map((value) => (
          <button key={value} className={`chip button ${energy === value ? 'lavender selected' : ''}`} onClick={() => setEnergy(value)}>
            {value === 'low' ? '🌿 Low' : value === 'medium' ? '🌤 Medium' : '☀️ High'}
          </button>
        ))}
        <button className="btn btn-sm btn-soft" onClick={loadProposal} disabled={loading}>
          <Compass size={14} /> {loading ? 'Looking…' : 'Show a gentle plan'}
        </button>
      </div>
      {proposal && (
        <div style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="small muted">
              {proposal.summary.scheduled_count} block(s) · about {proposal.summary.focus_minutes} min of focus · intentionally under-booked
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(proposal.blocks.map((_, index) => index))}>Select all</button>
          </div>
          <div style={{ marginTop: 10 }}>
            {proposal.blocks.map((block, index) => (
              <label key={index} className={`preview-block ${block.kind}`} style={{ cursor: 'pointer', alignItems: 'center' }}>
                <input
                  type="checkbox" checked={selected.includes(index)}
                  onChange={(event) => setSelected((current) => event.target.checked ? [...current, index] : current.filter((item) => item !== index))}
                />
                <span className="kind" />
                <span style={{ flex: 1 }}>
                  <strong>{new Date(block.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {block.label}</strong>
                  <div className="reason">{block.reason}</div>
                </span>
                <span className="tiny muted">{Math.round((new Date(block.end_at) - new Date(block.start_at)) / 60000)}m</span>
              </label>
            ))}
          </div>
          {proposal.unscheduled.length > 0 && (
            <div className="panel flat" style={{ marginTop: 10, padding: 13 }}>
              <div className="small strong">Left unscheduled on purpose</div>
              {proposal.unscheduled.map((item) => <div key={item.task_id} className="small muted">· {item.title}</div>)}
              <div className="tiny muted" style={{ marginTop: 6 }}>Nothing was moved. You can decide later.</div>
            </div>
          )}
          <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={close}>Not now</button>
            <button className="btn btn-primary" onClick={applyProposal} disabled={loading || !selected.length}>
              <Check size={15} /> Apply selected blocks
            </button>
          </div>
        </div>
      )}
      {!proposal && !loading && <div className="empty" style={{ marginTop: 16 }}>Choose your hours, then ask for a plan. You will see it before anything changes.</div>}
    </div>
  )

  const priority = () => (
    <div className="restart-step">
      {header('Choose one priority', 'One thing is enough.')}
      {loading && <div className="empty">Looking at what is open…</div>}
      {!loading && priorities.length === 0 && (
        <div className="empty">There are no open tasks right now. That is completely fine — you can close this and rest.</div>
      )}
      {!loading && priorities.map((item, index) => (
        <button key={item.task_id} className={`restart-choice ${chosen?.task_id === item.task_id ? 'selected' : ''}`} onClick={() => setChosen(item)}>
          <div className="row">
            <span className="chip lavender">{index + 1}</span>
            <strong style={{ flex: 1 }}>{item.title}</strong>
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>{item.reason}</div>
        </button>
      ))}
      {chosen && (
        <div className="panel tint-sage" style={{ marginTop: 12 }}>
          <strong>“{chosen.title}” is your one priority.</strong>
          <p className="small" style={{ margin: '4px 0 0' }}>{chosen.first_action || 'A tiny first step is waiting for you.'}</p>
        </div>
      )}
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={close}>Close</button>
        <button className="btn btn-primary" disabled={!chosen} onClick={async () => {
          // Only one task is ever "the" priority. Clear old flags first.
          const previous = tasks.filter((task) => task.is_main_priority && task.id !== chosen.task_id)
          for (const task of previous) {
            // eslint-disable-next-line no-await-in-loop
            await actions.updateTask(task.id, { is_main_priority: false })
          }
          await actions.updateTask(chosen.task_id, { is_main_priority: true, pinned: true }, 'One priority chosen. Everything else can wait.')
          await loadStarter(chosen.task_id)
          setStep('started')
        }}>
          Make this my priority <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )

  const started = () => (
    <div className="restart-step">
      {header('Help me get started', 'One tiny step. Two minutes counts.')}
      {loading && <div className="empty">Finding the smallest possible step…</div>}
      {starter && (
        <>
          {starter.task && <div className="eyebrow" style={{ marginBottom: 5 }}>For: {starter.task.title}</div>}
          <div className="assist-card">
            <div className="small muted">{starter.message}</div>
            <div className="assist-action" style={{ marginTop: 10 }}>{starter.assist.first_action}</div>
            <p className="small" style={{ margin: '10px 0 0' }}>{starter.assist.explanation}</p>
          </div>
          <div className="row-wrap" style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                focus.start({
                  taskId: starter.task?.id || null,
                  taskTitle: starter.task?.title || 'One tiny action',
                  minutes: 2, mode: 'task',
                })
                close()
              }}
            >
              <Clock3 size={15} /> Start for 2 minutes
            </button>
            <button className="btn btn-ghost" onClick={async () => {
              await actions.createTask({
                title: starter.task?.title || 'One tiny thing',
                first_action: starter.assist.first_action,
                status: 'today', estimated_minutes: 10,
              })
              toast('Saved as a small task for today.', 'gentle')
            }}>
              <ListChecks size={15} /> Save this as a task
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('menu')}>Something else</button>
          </div>
          <div className="panel flat" style={{ marginTop: 16, padding: 13 }}>
            <div className="small strong">After two minutes you may:</div>
            <div className="small muted">Continue if it feels easy · pause and come back later · save your progress. The choice is yours.</div>
          </div>
        </>
      )}
    </div>
  )

  const breather = () => {
    const isBreather = timer?.mode === 'breather'
    return (
      <div className="restart-step center">
        <div className="breathing-orb" />
        <div className="eyebrow">Nothing to achieve</div>
        <h2 style={{ fontSize: 28 }}>Just breathe for a moment.</h2>
        <p className="small" style={{ maxWidth: 400, margin: '0 auto' }}>Breathe in slowly, breathe out a little longer. Your tasks will still be here.</p>
        {isBreather && (
          <>
            <div className="display" style={{ fontSize: 58, fontVariantNumeric: 'tabular-nums', margin: '10px 0' }}>{formatClock(timer.remaining)}</div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-sm btn-ghost" onClick={() => focus.addMinutes(2)}>+ 2 minutes</button>
              <button className="btn btn-primary" onClick={async () => { await focus.finish({ completed: true, notes: 'Restart breather' }); close() }}>
                <PartyPopper size={15} /> I'm ready
              </button>
            </div>
          </>
        )}
        {timer && !isBreather && (
          <div className="panel flat" style={{ padding: 14, marginTop: 10 }}>
            <div className="small strong">A focus session is already running.</div>
            <div className="small muted">It has not been touched. Finish it first if you would like a timed break.</div>
          </div>
        )}
        {!timer && <button className="btn btn-primary" onClick={() => focus.start({ minutes: 5, mode: 'breather', label: 'A quiet breather' })}>Start a 5-minute break</button>}
        <div className="restart-foot">You can end this at any time. No streak, no score, no catch-up.</div>
      </div>
    )
  }

  if (!restartOpen) return null
  return createPortal(
    <div className="overlay-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <div className="restart-modal" role="dialog" aria-modal="true" aria-label="Restart DAYFLOW">
        <button className="icon-btn plain restart-close" onClick={close} aria-label="Close restart screen"><X size={18} /></button>
        {step === 'menu' && menu()}
        {step === 'rebuild' && rebuild()}
        {step === 'priority' && priority()}
        {step === 'started' && started()}
        {step === 'breather' && breather()}
      </div>
    </div>,
    document.body,
  )
}
