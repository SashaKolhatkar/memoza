import { useMemo, useState } from 'react'
import { Check, Plus, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import TaskComposer from '../components/TaskComposer'
import { Empty, SectionHead } from '../components/ui'
import { cx, formatDate } from '../lib/utils'

const DAY = 24 * 60 * 60 * 1000

const QUADRANTS = [
  {
    id: 'do', number: '1', label: 'Do first', meta: 'Urgent · important',
    hint: 'Give this your attention now.', tint: 'tint-peach', color: 'var(--peach-deep)',
  },
  {
    id: 'schedule', number: '2', label: 'Schedule', meta: 'Not urgent · important',
    hint: 'Give it a place before it becomes urgent.', tint: 'tint-sky', color: 'var(--sky-deep)',
  },
  {
    id: 'delegate', number: '3', label: 'Delegate', meta: 'Urgent · not important',
    hint: 'Hand it over, shrink it, or ask for help.', tint: 'tint-butter', color: 'var(--butter-deep)',
  },
  {
    id: 'letgo', number: '4', label: 'Let go for now', meta: 'Neither',
    hint: 'Safe to postpone without guilt.', tint: 'tint-sage', color: 'var(--sage-deep)',
  },
]

const IMPORTANCE_WORDS = ['', 'gentle', 'low', 'steady', 'high', 'essential']

function isUrgent(task, now) {
  if (!task.due_at) return false
  return new Date(task.due_at).getTime() - now <= 2 * DAY
}

function quadrantOf(task, now) {
  const important = Number(task.importance) >= 4
  const urgent = isUrgent(task, now)
  if (important && urgent) return 'do'
  if (important) return 'schedule'
  if (urgent) return 'delegate'
  return 'letgo'
}

function movePayload(quadrant) {
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 0, 0)
  const dueToday = endOfToday.toISOString()

  if (quadrant === 'do') return { importance: 5, due_at: dueToday, status: 'today' }
  if (quadrant === 'schedule') return { importance: 5, due_at: null, status: 'upcoming' }
  if (quadrant === 'delegate') return { importance: 2, due_at: dueToday, status: 'today' }
  return { importance: 1, due_at: null, status: 'someday' }
}

export default function EisenhowerMatrix() {
  const { tasks, actions } = useApp()
  const [composer, setComposer] = useState(null)
  const now = Date.now()

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'done' && task.status !== 'archived'),
    [tasks],
  )

  const grouped = useMemo(() => {
    const result = { do: [], schedule: [], delegate: [], letgo: [] }
    openTasks.forEach((task) => result[quadrantOf(task, now)].push(task))
    return result
  }, [openTasks, now])

  const move = (task, quadrant) => actions.updateTask(task.id, movePayload(quadrant), 'Moved in the matrix.')

  return (
    <div className="stack">
      <SectionHead
        eyebrow="A quieter way to decide"
        title="Eisenhower Matrix"
        description="Four places for what is asking for your attention. You can always move things again."
        actions={<button className="btn btn-primary" onClick={() => setComposer({ title: '' })}><Plus size={16} /> New task</button>}
      />

      <section className="panel tint-lavender">
        <div className="row">
          <Sparkles size={17} color="var(--lavender-deep)" />
          <div>
            <strong className="small">How tasks are sorted</strong>
            <div className="small muted">Important = importance 4–5. Urgent = due within 48 hours or overdue. No due date means not urgent.</div>
          </div>
        </div>
      </section>

      <div className="matrix-grid">
        {QUADRANTS.map((quadrant) => (
          <section key={quadrant.id} className={cx('panel', quadrant.tint, 'matrix-panel')}>
            <div className="matrix-head">
              <span className="matrix-number" style={{ background: quadrant.color }}>{quadrant.number}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{quadrant.label}</h3>
                <div className="tiny muted">{quadrant.meta} · {quadrant.hint}</div>
              </div>
              <span className="matrix-count">{grouped[quadrant.id].length}</span>
            </div>

            {grouped[quadrant.id].length === 0
              ? <Empty icon={Sparkles}>Nothing here. That is allowed.</Empty>
              : grouped[quadrant.id].map((task) => (
                <div key={task.id} className="matrix-task">
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <button
                      className="task-check"
                      title="Mark done"
                      onClick={() => actions.completeTask(task.id)}
                    ><Check size={12} strokeWidth={3} /></button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="task-title">{task.title}</div>
                      <div className="tiny muted" style={{ marginTop: 2 }}>
                        {task.category || 'general'} · {IMPORTANCE_WORDS[task.importance] || 'steady'} importance
                        {task.due_at ? ` · due ${formatDate(task.due_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 9 }}>
                    <select className="select" value={quadrant.id} onChange={(event) => move(task, event.target.value)} aria-label={`Move ${task.title}`}>
                      {QUADRANTS.map((option) => <option key={option.id} value={option.id}>Move to {option.label}</option>)}
                    </select>
                    <button className="btn btn-sm btn-ghost" onClick={() => setComposer(task)}>Edit</button>
                  </div>
                </div>
              ))}
          </section>
        ))}
      </div>

      <TaskComposer
        open={!!composer}
        onClose={() => setComposer(null)}
        task={composer?.id ? composer : null}
      />
    </div>
  )
}
