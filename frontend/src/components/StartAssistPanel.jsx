import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock3, ListTree, Save, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'

const ICONS = { timer: Clock3, list: ListTree, folder: BookOpen, save: Save }

export default function StartAssistPanel({ task, onBreakDown, onCreateTask }) {
  const { focus, toast } = useApp()
  const navigate = useNavigate()
  const [assist, setAssist] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!task?.title) { setAssist(null); return undefined }
    setLoading(true)
    api.tasks.assist(task.title, task.difficulty_reason).then((result) => {
      if (active) setAssist(result)
    }).catch(() => {}).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [task?.title, task?.difficulty_reason])

  if (!task) return null

  const options = assist?.options || []
  const tile = (option) => {
    const Icon = ICONS[option.icon] || Clock3
    return (
      <button
        key={option.id}
        className="option-tile"
        onClick={() => {
          if (option.id === 'break_down') {
            if (onBreakDown) onBreakDown(task)
            else toast('Open the task menu to break it into smaller actions.', 'gentle')
          } else if (option.id === 'continue') {
            toast('Your progress is saved. Pause or add notes whenever you need to.', 'gentle')
            navigate('/focus')
          } else if (option.minutes) {
            focus.start({ taskId: task.id, taskTitle: task.title, minutes: option.minutes })
          } else if (onCreateTask) onCreateTask(task)
        }}
      >
        <Icon size={17} color="var(--lavender-deep)" />
        <span className="option-label">{option.label}</span>
      </button>
    )
  }

  return (
    <div className="assist-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="eyebrow">Start Assist</div>
        <Sparkles size={17} color="var(--butter-deep)" />
      </div>
      <div className="assist-action" style={{ marginTop: 9 }}>
        {loading ? 'Finding the smallest step…' : assist?.first_action || task.first_action}
      </div>
      {options.length > 0 && <div className="option-grid" style={{ marginTop: 14 }}>{tile(options[0])}</div>}
      {(options.length > 1 || assist?.explanation) && (
        <details className="more-fields">
          <summary>More ways to start</summary>
          {assist?.explanation && <p className="small" style={{ margin: '8px 0 0' }}>{assist.explanation}</p>}
          {options.length > 1 && <div className="option-grid" style={{ marginTop: 10 }}>{options.slice(1).map(tile)}</div>}
        </details>
      )}
    </div>
  )
}
