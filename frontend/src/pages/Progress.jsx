import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Check, Circle, Clock3, ListTodo, Play, Repeat2, Share2, Sparkles, Target, Trophy,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useApp } from '../context/AppContext'
import BuddyCustomizer from '../components/BuddyCustomizer'
import ChibiCompanion, { buddyNameFor } from '../components/ChibiCompanion'
import { SectionHead } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import { cx, minutesLabel, todayISO } from '../lib/utils'

const LEVEL_NAMES = [
  'Just beginning', 'Finding your feet', 'Building rhythm',
  'Steady and kind', 'Quietly strong', 'Well practised',
]

const HOUR_BUCKETS = [
  { hour: 0, label: '12a' }, { hour: 4, label: '4a' }, { hour: 8, label: '8a' },
  { hour: 12, label: '12p' }, { hour: 16, label: '4p' }, { hour: 20, label: '8p' },
]

const COLORS = ['var(--lavender)', 'var(--peach)', 'var(--sage)', 'var(--butter)', 'var(--sky)']

const COMPANIONS = {
  down: { name: 'Milo', line: 'right here', title: 'I’m here with you' },
  evening: { name: 'Lumi', line: 'tucking in the day', title: 'Let’s put it down gently' },
  cheer: { name: 'Pip', line: 'your tiny cheerleader', title: 'Hey, you made it' },
}

function dayKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function Progress() {
  const { tasks, sessions, routines, routineLogs, insights, focus, toast, preferences } = useApp()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('day')
  const [mood, setMood] = useState(() => new Date().getHours() >= 18 ? 'evening' : 'cheer')

  const today = todayISO()
  const month = today.slice(0, 7)
  const inPeriod = (value) => {
    const key = dayKey(value)
    return period === 'day' ? key === today : key.startsWith(month)
  }

  const main = tasks.find((task) => task.is_main_priority && task.status !== 'done')
    || tasks.find((task) => task.status === 'today')

  const history = insights?.duration_history || []
  const categories = insights?.category_breakdown || []

  const stats = useMemo(() => {
    const finishedTasks = tasks.filter((task) => task.status === 'done' && inPeriod(task.completed_at))
    const focusSessions = sessions.filter((session) => session.mode === 'task' && session.actual_minutes > 0 && inPeriod(session.ended_at || session.started_at))
    const logs = routineLogs.filter((log) => inPeriod(log.day))
    return {
      done: finishedTasks.length,
      sessions: focusSessions.length,
      minutes: focusSessions.reduce((sum, session) => sum + (session.actual_minutes || 0), 0),
      routines: new Set(logs.map((log) => log.routine_id)).size,
      logs,
      finishedTasks,
    }
  }, [tasks, sessions, routineLogs, period]) // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = useMemo(() => {
    const points = period === 'day'
      ? HOUR_BUCKETS.map((bucket) => ({ label: bucket.label, minutes: 0, tasks: 0 }))
      : Array.from({ length: Number(today.slice(8, 10)) }, (_, index) => ({ label: String(index + 1), minutes: 0, tasks: 0 }))

    const place = (value) => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return -1
      return period === 'day' ? Math.floor(date.getHours() / 4) : date.getDate() - 1
    }

    sessions.forEach((session) => {
      if (session.mode !== 'task' || !(session.actual_minutes > 0)) return
      const stamp = session.ended_at || session.started_at
      if (!inPeriod(stamp)) return
      const index = place(stamp)
      if (points[index]) points[index].minutes += Math.round(session.actual_minutes)
    })

    tasks.forEach((task) => {
      if (task.status !== 'done' || !inPeriod(task.completed_at)) return
      const index = place(task.completed_at)
      if (points[index]) points[index].tasks += 1
    })

    return points
  }, [tasks, sessions, period, today, month]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalSessions = sessions.filter((session) => session.mode === 'task' && session.actual_minutes > 0).length
  const level = Math.floor(totalSessions / 3) + 1
  const levelXp = totalSessions % 3
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]

  const companion = COMPANIONS[mood] || COMPANIONS.cheer
  const buddyName = buddyNameFor(mood, preferences.buddyName, preferences.buddyCharacter)
  const buddyCharacter = preferences.buddyCharacter || 'auto'
  const buddyColor = preferences.buddyColor || 'default'
  const companionMessage = useMemo(() => {
    const taskWord = stats.done === 1 ? 'task' : 'tasks'
    const sessionWord = stats.sessions === 1 ? 'session' : 'sessions'
    const routineWord = stats.routines === 1 ? 'routine' : 'routines'

    if (mood === 'down') {
      if (stats.sessions > 0) return `Hey, I’m really glad you told me. You already showed up for ${stats.sessions} focus ${sessionWord} today — that counts, even if the rest feels heavy.`
      if (stats.done > 0) return `Hey, I’m glad you said something. You finished ${stats.done} ${taskWord} today — that's not nothing. You don't have to earn a break.`
      return 'I’m here. Nothing’s recorded yet, and that’s totally okay. We can sit here a sec, or do two quiet minutes if that feels good.'
    }
    if (mood === 'evening') {
      return `Okay, let’s put the day down gently. You finished ${stats.done} ${taskWord}, spent ${minutesLabel(stats.minutes)} in focus, and checked in with ${stats.routines} ${routineWord}. That's plenty to notice.`
    }
    return stats.sessions > 0 || stats.done > 0
      ? 'Hey, you’re already making a go of today. One tiny step is plenty — and so is taking a breath first.'
      : 'Hey, you’re here, and that’s enough for a beginning. Want me to sit with you while you pick one tiny step?'
  }, [mood, stats])

  const shareText = useMemo(() => {
    const label = period === 'day' ? 'Today' : 'This month'
    const taskWord = stats.done === 1 ? 'task' : 'tasks'
    const sessionWord = stats.sessions === 1 ? 'session' : 'sessions'
    const routineWord = stats.routines === 1 ? 'routine' : 'routines'
    return `${label} in DAYFLOW: ${stats.done} ${taskWord} finished · ${stats.sessions} focus ${sessionWord} · ${minutesLabel(stats.minutes)} in focus · ${stats.routines} ${routineWord} practised. Small steps count.`
  }, [period, stats])

  const shareStats = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My DAYFLOW progress', text: shareText })
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText)
        toast('Your progress summary was copied.', 'gentle')
        return
      }
      const field = document.createElement('textarea')
      field.value = shareText
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      const copied = document.execCommand('copy')
      field.remove()
      toast(copied ? 'Your progress summary was copied.' : 'Could not copy right now.', copied ? 'gentle' : 'warn')
    } catch (error) {
      if (error?.name !== 'AbortError') toast('Could not share right now.', 'warn')
    }
  }

  const quests = period === 'day' ? [
    {
      id: 'start', icon: Play, title: 'Start one small session',
      value: stats.sessions, target: 1,
      action: () => focus.start({ taskId: main?.id, taskTitle: main?.title || 'Open focus session', minutes: 2 }),
      actionLabel: 'Start 2 minutes',
      why: 'Beginning is the hardest part. Two minutes is long enough to prove you can begin.',
    },
    {
      id: 'finish', icon: ListTodo, title: 'Finish one task',
      value: stats.done, target: 1,
      action: () => navigate('/tasks'), actionLabel: 'See my tasks',
      why: 'A finished task is a real, quiet win. It does not need to be a big one.',
    },
    {
      id: 'routine', icon: Repeat2, title: 'Check in with a routine',
      value: stats.logs.length, target: 1,
      action: () => navigate('/routines'), actionLabel: 'Open routines',
      why: 'Marking the small version still counts. Routines here never keep score against you.',
    },
  ] : [
    {
      id: 'sessions', icon: Clock3, title: 'Record 5 focus sessions',
      value: stats.sessions, target: 5,
      action: () => focus.start({ taskId: main?.id, taskTitle: main?.title || 'Open focus session', minutes: 2 }),
      actionLabel: 'Start 2 minutes',
      why: 'Recorded sessions are the only thing that makes future plans more honest.',
    },
    {
      id: 'tasks', icon: ListTodo, title: 'Complete 10 tasks',
      value: stats.done, target: 10,
      action: () => navigate('/tasks'), actionLabel: 'See my tasks',
      why: 'Small completed tasks add up. This is a direction, not a deadline.',
    },
    {
      id: 'routines', icon: Repeat2, title: 'Practise 3 different routines',
      value: stats.routines, target: 3,
      action: () => navigate('/routines'), actionLabel: 'Open routines',
      why: 'Trying different routines shows what actually fits your days.',
    },
  ]

  const previousLevel = useRef(level)
  const previousQuests = useRef('')
  const previousMonthDone = useRef(stats.done)
  const completedQuests = quests.filter((quest) => quest.value >= quest.target).map((quest) => `${period}:${quest.id}`).join(',')

  useEffect(() => {
    if (level > previousLevel.current) celebrate('level-up')
    previousLevel.current = level
  }, [level])

  useEffect(() => {
    if (previousQuests.current) {
      const now = new Set(completedQuests.split(',').filter(Boolean))
      const before = new Set(previousQuests.current.split(',').filter(Boolean))
      if ([...now].some((id) => !before.has(id))) celebrate('quest-done')
    }
    previousQuests.current = completedQuests
  }, [completedQuests])

  useEffect(() => {
    if (period === 'month' && stats.done >= 10 && previousMonthDone.current < 10) celebrate('month-goal')
    previousMonthDone.current = stats.done
  }, [period, stats.done])

  const suggestions = useMemo(() => {
    const result = []
    const accuracy = insights?.average_estimate_accuracy
    if (accuracy && accuracy > 1.15) {
      result.push({
        title: 'Give a block a little more room',
        body: 'Your recorded sessions usually take longer than planned. Try a slightly longer block, or make the first step smaller.',
        action: () => navigate('/time'), label: 'Adjust a session',
      })
    }
    const top = insights?.category_breakdown?.[0]
    if (top?.category) {
      result.push({
        title: `Protect a little time for ${top.category}`,
        body: `Most of your finished tasks are in ${top.category}. A small regular block may make that work easier to begin.`,
        action: () => navigate('/calendar'), label: 'Open calendar',
      })
    }
    if (!routines.length) {
      result.push({
        title: 'Try a minimum routine',
        body: 'One tiny version of a routine can give a day a soft landing. It is optional and never scored.',
        action: () => navigate('/routines'), label: 'Create a routine',
      })
    }
    if (!result.length) {
      result.push({
        title: 'Record one short session',
        body: 'Once you have a little history here, suggestions will come from your own recordings — never from guesses about you.',
        action: () => focus.start({ minutes: 2, mode: 'task', taskTitle: 'Open focus session' }), label: 'Start 2 minutes',
      })
    }
    return result.slice(0, 3)
  }, [insights, routines, focus, navigate])

  return (
    <div className="stack">
      <SectionHead
        title="Progress"
        actions={(
          <div className="row" style={{ gap: 8 }}>
            <div className="tabs">
              <button className={cx('tab', period === 'day' && 'active')} onClick={() => setPeriod('day')}>Today</button>
              <button className={cx('tab', period === 'month' && 'active')} onClick={() => setPeriod('month')}>This month</button>
            </div>
            <button className="btn btn-sm btn-soft" onClick={shareStats}><Share2 size={14} /> Share</button>
          </div>
        )}
      />

      <section className="panel tint-lavender">
        <div className="row">
          <Trophy size={22} color="var(--lavender-deep)" />
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Level {level} · {levelName}</div>
            <div className="priority-title" style={{ marginTop: 4 }}>
              {levelXp} of 3 sessions toward the next level
            </div>
          </div>
          <Sparkles size={18} color="var(--lavender-deep)" />
        </div>
        <div className="progress-track" style={{ marginTop: 12 }}>
          <div className="progress-fill" style={{ width: `${(levelXp / 3) * 100}%` }} />
        </div>
        <div className="tiny muted" style={{ marginTop: 9 }}>
          Levels come only from sessions you recorded. There are no streaks to lose.
        </div>
      </section>

      <section className="panel tint-sky companion-card">
        <ChibiCompanion mood={mood} color={buddyColor} character={buddyCharacter} name={buddyName} size={96} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">{buddyName} · {companion.line}</div>
          <h2 style={{ marginTop: 4 }}>{companion.title}</h2>
          <p className="small" style={{ margin: '4px 0 10px' }}>{companionMessage}</p>
          <div className="row-wrap">
            <button className={cx('btn btn-sm', mood === 'down' ? 'btn-primary' : 'btn-ghost')} onClick={() => setMood('down')}>Having a rough moment</button>
            <button className={cx('btn btn-sm', mood === 'evening' ? 'btn-primary' : 'btn-ghost')} onClick={() => setMood('evening')}>Let’s close the day</button>
            <button className={cx('btn btn-sm', mood === 'cheer' ? 'btn-primary' : 'btn-ghost')} onClick={() => setMood('cheer')}>Cheer me on</button>
            {mood === 'down' && (
              <button className="btn btn-sm btn-soft" onClick={() => focus.start({ taskId: main?.id, taskTitle: main?.title || 'Open focus session', minutes: 2 })}><Play size={13} /> Let’s do 2 minutes</button>
            )}
            {mood === 'evening' && (
              <button className="btn btn-sm btn-soft" onClick={() => toast('The day can wait until tomorrow.', 'gentle')}>Tuck the day in</button>
            )}
          </div>
          <details className="more-fields buddy-custom-toggle">
            <summary>Customize {buddyName}</summary>
            <BuddyCustomizer />
          </details>
        </div>
      </section>

      <section className="panel">
        <div className="section-head"><h2>{period === 'day' ? "Today's quests" : 'Monthly quests'}</h2></div>
        {quests.map((quest) => {
          const done = quest.value >= quest.target
          const Icon = quest.icon
          return (
            <div key={quest.id} className="task-row" style={{ alignItems: 'flex-start' }}>
              <button
                className={cx('task-check', done && 'checked')}
                title={done ? 'Complete' : 'Not yet'}
                onClick={() => (done ? toast('Already done. Nothing else is required.', 'gentle') : quest.action())}
              >
                {done ? <Check size={14} strokeWidth={3} /> : <Icon size={13} />}
              </button>
              <div className="task-main">
                <div className="task-title">{quest.title}</div>
                <div className="small muted">{Math.min(quest.value, quest.target)} / {quest.target}</div>
                <div className="progress-track" style={{ marginTop: 6, maxWidth: 260 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(100, (quest.value / quest.target) * 100)}%` }} />
                </div>
                <details className="more-fields">
                  <summary>Why this helps</summary>
                  <p className="small" style={{ margin: '7px 0 0' }}>{quest.why}</p>
                </details>
              </div>
              {!done && <button className="btn btn-sm btn-soft" onClick={quest.action}>{quest.actionLabel}</button>}
            </div>
          )
        })}
      </section>

      <div className="kpi-row">
        <div className="kpi"><div className="kpi-value">{stats.done}</div><div className="kpi-label">tasks finished</div></div>
        <div className="kpi"><div className="kpi-value">{stats.sessions}</div><div className="kpi-label">focus sessions</div></div>
        <div className="kpi"><div className="kpi-value">{minutesLabel(stats.minutes)}</div><div className="kpi-label">time in focus</div></div>
        <div className="kpi"><div className="kpi-value">{stats.routines}</div><div className="kpi-label">routines practised</div></div>
      </div>

      <section className="panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Recorded only</div>
            <h2>{period === 'day' ? 'Today’s rhythm' : 'This month’s rhythm'}</h2>
          </div>
          <BarChart3 size={17} color="var(--sky-deep)" />
        </div>
        <div className="grid-2">
          {[
            { key: 'minutes', title: 'Focus minutes', color: 'var(--lavender)', format: (value) => `${value} min` },
            { key: 'tasks', title: 'Tasks finished', color: 'var(--sage)', format: (value) => `${value} task${value === 1 ? '' : 's'}` },
          ].map((series) => (
            <div key={series.key}>
              <div className="chart-caption">{series.title}</div>
              <div className="chart-wrap chart-short">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'var(--muted)' }}
                      interval={period === 'month' ? Math.max(0, Math.floor(chartData.length / 7)) : 0}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }}
                      formatter={(value) => series.format(value)}
                    />
                    <Bar dataKey={series.key} fill={series.color} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>Bars use only sessions and completed tasks recorded in DAYFLOW.</div>
      </section>

      {(history.length > 0 || categories.length > 0) && (
        <section className="panel">
          <div className="section-head">
            <div>
              <div className="eyebrow">From your history</div>
              <h2>Patterns worth noticing</h2>
            </div>
            <Sparkles size={17} color="var(--lavender-deep)" />
          </div>
          <div className="grid-2">
            {history.length > 0 && (
              <div>
                <div className="chart-caption">Planned vs actual</div>
                <div className="chart-wrap chart-short">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={history} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(value) => value.slice(5)} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="planned" name="Planned" fill="var(--lavender)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="actual" name="Actual" fill="var(--sage)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {categories.length > 0 && (
              <div>
                <div className="chart-caption">Completed by category</div>
                <div className="chart-wrap chart-short">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categories} dataKey="count" nameKey="category" innerRadius={44} outerRadius={72} paddingAngle={3}>
                        {categories.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="row-wrap" style={{ justifyContent: 'center' }}>
                  {categories.map((item, index) => (
                    <span key={item.category} className="chip">
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: COLORS[index % COLORS.length] }} />
                      {item.category} · {item.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>
            All time: {insights?.total_tasks_completed || 0} tasks · {insights?.total_sessions || 0} sessions · {minutesLabel(insights?.total_focus_minutes || 0)} focus. Nothing is guessed.
          </div>
        </section>
      )}

      <section className="panel tint-butter">
        <div className="section-head"><div><div className="eyebrow">What you could try next</div><h2>A gentler nudge</h2></div><Target size={18} color="var(--butter-deep)" /></div>
        {suggestions.map((item) => (
          <div key={item.title} className="schedule-card" style={{ marginBottom: 8 }}>
            <div className="label">{item.title}</div>
            <div className="meta">{item.body}</div>
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={item.action}>{item.label} <ArrowRight size={13} /></button>
          </div>
        ))}
        <div className="tiny muted" style={{ marginTop: 10 }}>Suggestions use only what you recorded here. Nothing is guessed about your mood or behaviour.</div>
      </section>

      {main && (
        <section className="panel flat">
          <div className="row">
            <Circle size={16} color="var(--sage-deep)" />
            <div style={{ flex: 1 }}>
              <div className="small strong">One clear next step</div>
              <div className="small muted">{main.first_action || `Open ${main.title} and look at it for a moment.`}</div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => focus.start({ taskId: main.id, taskTitle: main.title, minutes: 2 })}><Play size={13} /> Start</button>
          </div>
        </section>
      )}
    </div>
  )
}
