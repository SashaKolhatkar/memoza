import { useState } from 'react'
import { Check, Circle, Plus, Repeat2, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Empty, Field, Modal, SectionHead, Switch } from '../components/ui'
import { addDays, cx, localDateKey, todayISO } from '../lib/utils'

const VERSION_LABELS = { full: 'Full', short: 'Short', minimum: 'Minimum' }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const emptyRoutine = {
  name: '', time_of_day: 'morning', reminder_time: '08:00', optional: false,
  days: [0, 1, 2, 3, 4, 5, 6], full_steps: [], short_steps: [], minimum_steps: [],
}

export default function Routines() {
  const { routines, routineLogs, actions } = useApp()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyRoutine)
  const [stepDraft, setStepDraft] = useState({ full: '', short: '', minimum: '' })

  const openNew = () => { setForm(emptyRoutine); setStepDraft({ full: '', short: '', minimum: '' }); setModal({ create: true }) }
  const openEdit = (routine) => { setForm({ ...routine }); setStepDraft({ full: '', short: '', minimum: '' }); setModal({ routine }) }

  const save = async () => {
    if (!form.name.trim()) return
    const payload = {
      ...form,
      name: form.name.trim(),
      days: form.days.map(Number),
      full_steps: form.full_steps.filter(Boolean),
      short_steps: form.short_steps.filter(Boolean),
      minimum_steps: form.minimum_steps.filter(Boolean),
      reminder_time: form.reminder_time || null,
    }
    if (modal.routine) await actions.updateRoutine(modal.routine.id, payload)
    else await actions.createRoutine(payload)
    setModal(null)
  }

  const addStep = (version) => {
    const text = stepDraft[version].trim()
    if (!text) return
    setForm((current) => ({ ...current, [`${version}_steps`]: [...(current[`${version}_steps`] || []), text] }))
    setStepDraft((current) => ({ ...current, [version]: '' }))
  }

  return (
    <div className="stack">
      <SectionHead
        title="Flexible Routines"
        actions={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New routine</button>}
      />

      {routines.length === 0
        ? <section className="panel"><Empty icon={Repeat2}>Create a routine with three versions. Missing days are never punished.</Empty></section>
        : <div className="grid-2" style={{ alignItems: 'start' }}>
          {routines.map((routine) => {
            const todayLog = routineLogs.find((log) => log.routine_id === routine.id && log.day === todayISO())
            const history = routineLogs.filter((log) => log.routine_id === routine.id).slice(-7)
            const isToday = routine.days.includes(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
            return (
              <section key={routine.id} className={`panel ${routine.time_of_day === 'evening' ? 'tint-peach' : 'tint-sage'}`}>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <div className="eyebrow">{routine.time_of_day}{routine.optional ? ' · optional' : ''}</div>
                    <h2 style={{ margin: 0 }}>{routine.name}</h2>
                  </div>
                  <button className="icon-btn" onClick={() => openEdit(routine)} title="Edit routine"><Repeat2 size={16} /></button>
                  <button className="icon-btn" onClick={() => actions.removeRoutine(routine.id)} title="Delete routine"><Trash2 size={15} /></button>
                </div>
                <div className="divider" />
                {['full', 'short', 'minimum'].map((version) => {
                  const steps = routine[`${version}_steps`] || []
                  const logged = history.find((log) => log.day === todayISO() && log.version === version)
                  return (
                    <div key={version} style={{ marginBottom: 13 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong className="small">{VERSION_LABELS[version]} routine</strong>
                        <button
                          className={`btn btn-sm ${logged ? 'btn-sage' : 'btn-ghost'}`}
                          onClick={() => actions.logRoutine(routine.id, { version, day: todayISO(), completed: !logged, note: '' })}
                        >
                          {logged ? <><Check size={13} /> Done today</> : <><Circle size={13} /> Mark today</>}
                        </button>
                      </div>
                      <div className="small muted" style={{ marginTop: 3 }}>
                        {steps.length ? steps.join(' → ') : 'No steps defined yet.'}
                      </div>
                    </div>
                  )
                })}
                <details className="more-fields">
                  <summary>History</summary>
                  <div className="tiny muted">Last 7 days · {history.length ? history.map((log) => `${log.day.slice(5)} ${VERSION_LABELS[log.version]?.slice(0, 3)}`).join(' · ') : 'no check-ins yet'}</div>
                  {!isToday && <div className="tiny muted" style={{ marginTop: 4 }}>Not scheduled for today. That is fine.</div>}
                </details>
              </section>
            )
          })}
        </div>}

      <Modal
        open={!!modal} onClose={() => setModal(null)} wide
        title={modal?.routine ? 'Edit routine' : 'New routine'}
        subtitle="Write three versions so the day can meet you where you are."
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>Save routine</button></>}
      >
        <div className="stack">
          <Field label="Routine name"><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Morning landing" /></Field>
          {['full', 'short', 'minimum'].map((version) => (
            <Field key={version} label={`${VERSION_LABELS[version]} version`}>
              <div className="row">
                <input className="input" value={stepDraft[version]} onChange={(event) => setStepDraft({ ...stepDraft, [version]: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addStep(version) } }} placeholder="Add one step…" />
                <button className="btn btn-ghost" onClick={() => addStep(version)}><Plus size={15} /></button>
              </div>
              <div className="row-wrap" style={{ marginTop: 7 }}>
                {(form[`${version}_steps`] || []).map((step, index) => (
                  <span key={index} className="chip sage">{step} <button className="btn btn-quiet btn-sm" style={{ padding: 0, marginLeft: 2 }} onClick={() => setForm((current) => ({ ...current, [`${version}_steps`]: current[`${version}_steps`].filter((_, i) => i !== index) }))}>×</button></span>
                ))}
              </div>
            </Field>
          ))}
          <details className="more-fields">
            <summary>More options</summary>
            <div className="stack">
              <div className="grid-2">
                <Field label="Time of day"><select className="select" value={form.time_of_day} onChange={(event) => setForm({ ...form, time_of_day: event.target.value })}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="anytime">Anytime</option></select></Field>
                <Field label="Reminder time"><input className="input" type="time" value={form.reminder_time || ''} onChange={(event) => setForm({ ...form, reminder_time: event.target.value })} /></Field>
              </div>
              <div>
                <div className="field-label">Repeat on</div>
                <div className="row-wrap" style={{ marginTop: 6 }}>
                  {DAYS.map((day, index) => (
                    <button key={day} className={`chip button ${form.days.includes(index) ? 'lavender selected' : ''}`} onClick={() => setForm((current) => ({ ...current, days: current.days.includes(index) ? current.days.filter((item) => item !== index) : [...current.days, index] }))}>{day}</button>
                  ))}
                </div>
              </div>
              <Switch checked={form.optional} onChange={(value) => setForm({ ...form, optional: value })} label="This routine is optional" />
            </div>
          </details>
        </div>
      </Modal>
    </div>
  )
}
