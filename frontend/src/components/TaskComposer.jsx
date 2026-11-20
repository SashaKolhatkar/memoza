import { useEffect, useState } from 'react'
import { Sparkles, WandSparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { DIFFICULTIES, toLocalInput } from '../lib/utils'
import { Field, Modal } from './ui'

const SHORT_DIFFICULTY = {
  unknown: 'Where do I start?', overwhelming: 'Too big',
  quality: 'Not good enough', unmotivated: 'No motivation', distracted: 'Distracted',
}

const empty = {
  title: '', notes: '', status: 'today', priority: 'normal', importance: 3, category: 'general',
  difficulty_reason: null, first_action: '', energy: 'medium', estimated_minutes: 25,
  due_at: null, rough_mode: 'off', done_enough: '', milestones: [], tags: [],
}

export default function TaskComposer({ open, onClose, task = null, defaultStatus = 'today', defaultDifficulty = null }) {
  const { actions } = useApp()
  const [form, setForm] = useState(empty)
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(task ? {
      ...empty, ...task,
      due_at: task.due_at ? toLocalInput(task.due_at) : null,
    } : { ...empty, status: defaultStatus, difficulty_reason: defaultDifficulty })
  }, [open, task, defaultStatus, defaultDifficulty])

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const suggest = async () => {
    if (!form.title.trim()) return
    setSuggesting(true)
    try {
      const result = await api.tasks.assist(form.title, form.difficulty_reason)
      set('first_action', result.first_action)
    } finally { setSuggesting(false) }
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      title: form.title.trim(),
      estimated_minutes: Number(form.estimated_minutes) || 25,
      importance: Number(form.importance),
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
    }
    if (task) await actions.updateTask(task.id, payload, 'Task updated.')
    else await actions.createTask(payload)
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open} onClose={onClose} wide
      title={task ? 'Edit task' : 'Add a task'}
      subtitle="You do not have to figure out the whole thing. A first action is enough."
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || !form.title.trim()}>{saving ? 'Saving…' : task ? 'Save changes' : 'Add task'}</button>
      </>}
    >
      <div className="stack">
        <Field label="What needs doing?">
          <input className="input" autoFocus value={form.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Write the project outline" />
        </Field>

        <div>
          <div className="field-label" style={{ marginBottom: 7 }}>Why does starting feel hard? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></div>
          <div className="row-wrap">
            {DIFFICULTIES.map((item) => (
              <button key={item.id} title={item.label} className={`chip button ${form.difficulty_reason === item.id ? 'lavender selected' : ''}`} onClick={() => set('difficulty_reason', form.difficulty_reason === item.id ? null : item.id)}>
                <span>{item.emoji}</span> {SHORT_DIFFICULTY[item.id]}
              </button>
            ))}
          </div>
        </div>

        <Field label="Tiny first action" hint="Starting is an accomplishment. This is the smallest visible step.">
          <div className="row" style={{ alignItems: 'stretch' }}>
            <input className="input" value={form.first_action} onChange={(event) => set('first_action', event.target.value)} placeholder="Open the document and write one line" />
            <button className="btn btn-soft" onClick={suggest} disabled={suggesting || !form.title.trim()} title="Suggest a first action">
              <WandSparkles size={16} /> {suggesting ? '…' : 'Suggest'}
            </button>
          </div>
        </Field>

        <details className="more-fields">
          <summary>More options</summary>
          <div className="grid-2">
          <Field label="When">
            <select className="select" value={form.status} onChange={(event) => set('status', event.target.value)}>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="someday">Someday</option>
            </select>
          </Field>
          <Field label="Due date (optional)">
            <input className="input" type="datetime-local" value={form.due_at || ''} onChange={(event) => set('due_at', event.target.value || null)} />
          </Field>
          <Field label="Importance">
            <select className="select" value={form.importance} onChange={(event) => set('importance', event.target.value)}>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} — {['', 'gentle', 'low', 'steady', 'high', 'essential'][value]}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="select" value={form.priority} onChange={(event) => set('priority', event.target.value)}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
            </select>
          </Field>
          <Field label="Category">
            <input className="input" value={form.category} onChange={(event) => set('category', event.target.value)} placeholder="work, study, personal…" />
          </Field>
          <Field label="Energy this needs">
            <select className="select" value={form.energy} onChange={(event) => set('energy', event.target.value)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </Field>
          <Field label="Estimated minutes" hint="An estimate, never a promise.">
            <input className="input" type="number" min="5" max="480" step="5" value={form.estimated_minutes} onChange={(event) => set('estimated_minutes', event.target.value)} />
          </Field>
        </div>

          <Field label="Notes (optional)">
            <textarea className="textarea" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Anything that helps you begin…" />
          </Field>
        </details>
      </div>
    </Modal>
  )
}
