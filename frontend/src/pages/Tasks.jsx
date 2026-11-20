import { useMemo, useState } from 'react'
import { CalendarClock, Plus, Search, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { breakDownTask } from '../lib/breakdown'
import TaskComposer from '../components/TaskComposer'
import TaskRow from '../components/TaskRow'
import StartAssistPanel from '../components/StartAssistPanel'
import { Empty, SectionHead } from '../components/ui'
import { cx, formatDate } from '../lib/utils'

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'done', label: 'Done' },
]
const MORE_TABS = [
  { id: 'someday', label: 'Someday' },
  { id: 'all', label: 'All' },
]

export default function Tasks() {
  const { tasks, refresh } = useApp()
  const [tab, setTab] = useState('today')
  const [search, setSearch] = useState('')
  const [composer, setComposer] = useState(null)
  const [selected, setSelected] = useState(null)

  const visible = useMemo(() => tasks
    .filter((task) => tab === 'all' || task.status === tab)
    .filter((task) => !search || `${task.title} ${task.notes} ${task.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.is_main_priority - a.is_main_priority) || (b.pinned - a.pinned) || a.position - b.position || new Date(b.created_at) - new Date(a.created_at)),
  [tasks, tab, search])

  const missed = tasks.filter((task) => task.status !== 'done' && task.scheduled_start && new Date(task.scheduled_start) < new Date())
  const focusTask = selected && tasks.find((task) => task.id === selected.id)
  const activeTask = focusTask || visible[0]

  const breakDown = (task) => breakDownTask(task, refresh)

  return (
    <div className="stack">
      <SectionHead
        title="Tasks"
        actions={<button className="btn btn-primary" onClick={() => setComposer({ title: '' })}><Plus size={16} /> New task</button>}
      />

      {missed.length > 0 && (
        <section className="panel tint-butter">
          <div className="row">
            <CalendarClock size={18} color="var(--butter-deep)" />
            <div style={{ flex: 1 }}>
              <strong className="small">A time passed for {missed.length} task{missed.length > 1 ? 's' : ''}.</strong>
              <div className="small muted">Choose individually what to do — we never move everything at once.</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {missed.map((task) => <TaskRow key={task.id} task={task} onEdit={setComposer} />)}
          </div>
        </section>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(280px, 1fr)', alignItems: 'start' }}>
        <section className="panel">
          <div className="tabs" style={{ marginBottom: 14 }}>
            {TABS.map((item) => <button key={item.id} className={cx('tab', tab === item.id && 'active')} onClick={() => setTab(item.id)}>{item.label}</button>)}
            {MORE_TABS.some((item) => item.id === tab)
              && <button className="tab active" title="Back to today" onClick={() => setTab('today')}>{MORE_TABS.find((item) => item.id === tab).label}</button>}
          </div>
          <div className="row" style={{ marginBottom: 8 }}>
            <Search size={16} className="muted" />
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a task…" />
          </div>
          {visible.length === 0
            ? <Empty icon={Sparkles}>{search ? 'Nothing matches that search.' : 'Nothing here yet. That is allowed.'}</Empty>
            : visible.map((task) => (
              <div key={task.id} className={cx(activeTask?.id === task.id && 'selected-task')} onClick={() => setSelected(task)}>
                <TaskRow task={task} showFirstAction={activeTask?.id === task.id} onEdit={setComposer} />
              </div>
            ))}
          <details className="more-fields">
            <summary>More lists</summary>
            <div className="row-wrap">
              {MORE_TABS.map((item) => (
                <button key={item.id} className={cx('btn btn-sm', tab === item.id ? 'btn-primary' : 'btn-ghost')} onClick={() => setTab(item.id)}>{item.label}</button>
              ))}
            </div>
          </details>
        </section>

        <div className="stack">
          <section className="panel">
            {activeTask ? <StartAssistPanel task={activeTask} onBreakDown={breakDown} /> : <Empty>Pick a task to see one small first action.</Empty>}
          </section>
          {(activeTask?.notes || activeTask?.due_at) && (
            <details className="more-fields">
              <summary>Task details</summary>
              <div className="stack">
                {activeTask?.notes && (
                  <section className="panel flat">
                    <div className="eyebrow">Notes</div>
                    <p className="small" style={{ margin: '7px 0 0', whiteSpace: 'pre-wrap' }}>{activeTask.notes}</p>
                  </section>
                )}
                {activeTask?.due_at && (
                  <section className="panel flat tint-peach">
                    <div className="eyebrow">Due</div>
                    <div className="small">{formatDate(activeTask.due_at, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                  </section>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
      <TaskComposer open={!!composer} onClose={() => setComposer(null)} task={composer?.id ? composer : null} defaultStatus={tab === 'all' ? 'today' : tab} />
    </div>
  )
}
