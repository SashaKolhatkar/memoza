import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, apiState } from '../lib/api'
import { celebrate } from '../lib/celebrate'
import { DEFAULT_PREFERENCES, localDateKey } from '../lib/utils'

const AppContext = createContext(null)
const FOCUS_KEY = 'dayflow:activeFocus'

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState('local')
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [braindumps, setBraindumps] = useState([])
  const [routines, setRoutines] = useState([])
  const [routineLogs, setRoutineLogs] = useState([])
  const [events, setEvents] = useState([])
  const [sessions, setSessions] = useState([])
  const [blocks, setBlocks] = useState([])
  const [insights, setInsights] = useState(null)
  const [toasts, setToasts] = useState([])
  const [restartOpen, setRestartOpen] = useState(false)
  const [timer, setTimer] = useState(null)
  const timerRef = useRef(null)
  const breakStarting = useRef(false)

  const toast = useCallback((message, tone = 'calm') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5200)
  }, [])

  const refresh = useCallback(async () => {
    setMode(apiState.mode)
    const [taskList, dumpList, routineList, logList, eventList, sessionList] = await Promise.all([
      api.tasks.list(), api.braindumps.list(), api.routines.list(), api.routines.logs(), api.events.list(), api.sessions.list(),
    ])
    setTasks(taskList)
    setBraindumps(dumpList)
    setRoutines(routineList)
    setRoutineLogs(logList)
    setEvents(eventList)
    setSessions(sessionList)
    try {
      const blockList = await api.schedule.blocks(localDateKey())
      setBlocks(blockList)
    } catch { /* schedule blocks are optional on first load */ }
  }, [])

  const refreshInsights = useCallback(async () => {
    try { setInsights(await api.insights.get()) } catch { /* insights are non-critical */ }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const result = await api.init()
        if (!active) return
        setMode(result.mode)
        setUser(result.user)
        await refresh()
        await refreshInsights()
        try {
          const saved = JSON.parse(localStorage.getItem(FOCUS_KEY) || 'null')
          if (saved?.sessionId) setTimer(saved)
        } catch { /* ignore malformed saved timer */ }
      } catch (error) {
        toast(`Memoza could not load your data: ${error.message}`, 'warn')
      } finally {
        if (active) setReady(true)
      }
    })()
    return () => { active = false }
  }, [refresh, refreshInsights, toast])

  useEffect(() => {
    if (timer) localStorage.setItem(FOCUS_KEY, JSON.stringify(timer))
    else localStorage.removeItem(FOCUS_KEY)
  }, [timer])

  useEffect(() => {
    if (!timer?.running) return undefined
    timerRef.current = setInterval(() => {
      setTimer((current) => {
        if (!current || !current.running) return current
        // Open sessions are stopwatches: start at zero and count upward.
        if (current.countUp) {
          const elapsed = Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000))
          return elapsed === current.remaining ? current : { ...current, remaining: elapsed }
        }
        const remaining = current.remaining === 0 && current.running
          ? 0
          : Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000))
        if (remaining === 0) {
          // The focus block is over, but the session stays open until it is
          // saved. Task mode queues a short break instead of stopping outright.
          if (current.mode === 'task' && !current.breakStarted) {
            toast('Focus block finished. A short break is starting.', 'gentle')
            return { ...current, remaining: 0, running: false, endsAt: null, breakStarted: true }
          }
          if (current.mode === 'task') return current
          if (!current.endNotified) {
            celebrate('break-done')
            toast('Break time is up. Your session stays open until you finish or pause.', 'gentle')
            return { ...current, remaining: 0, running: true, endsAt: null, endNotified: true }
          }
          return current
        }
        return { ...current, remaining }
      })
    }, 500)
    return () => clearInterval(timerRef.current)
  }, [timer?.running, toast])

  const preferences = user?.preferences || DEFAULT_PREFERENCES
  const theme = preferences.theme || 'light'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.scrollBehavior = preferences.reduceMotion ? 'auto' : 'smooth'
  }, [theme, preferences.reduceMotion])

  const setPreference = useCallback(async (key, value) => {
    const next = { ...preferences, [key]: value }
    setUser((current) => ({ ...(current || {}), preferences: next }))
    try {
      const updated = await api.auth.prefs({ [key]: value })
      setUser(updated)
    } catch (error) {
      toast(error.message, 'warn')
    }
  }, [preferences, toast])

  const setNotificationPreference = useCallback(async (key, value) => {
    const notificationPreferences = { ...(preferences.notificationPreferences || {}), [key]: value }
    await setPreference('notificationPreferences', notificationPreferences)
  }, [preferences, setPreference])

  const run = useCallback(async (operation, message) => {
    try {
      const result = await operation()
      await refresh()
      if (message) toast(message)
      return result
    } catch (error) {
      toast(error.message, 'warn')
      return null
    }
  }, [refresh, toast])

  const actions = useMemo(() => {
    const taskCelebration = (id) => {
      const doneCount = tasks.filter((task) => task.status === 'done').length + 1
      const left = tasks.filter((task) => task.status !== 'done' && task.status !== 'archived').length - 1
      const finished = tasks.find((task) => task.id === id)
      const overdue = finished?.due_at && new Date(finished.due_at).getTime() < Date.now()
      if (left === 0) return 'all-clear'
      if (overdue) return 'deadline-met'
      if (doneCount === 1) return 'first-task'
      if (doneCount === 5) return 'five-tasks'
      if (doneCount === 10) return 'ten-tasks'
      return 'task-done'
    }
    return {
    createTask: (payload) => run(() => api.tasks.create(payload), 'Task added. Small steps count.'),
    updateTask: (id, payload, message) => run(() => api.tasks.update(id, payload), message),
    removeTask: (id) => run(() => api.tasks.remove(id), 'Task removed.'),
    startTask: (id) => run(() => api.tasks.start(id), 'Started. That is the hardest part.'),
    completeTask: (id, actualMinutes) => run(async () => {
      const result = await api.tasks.complete(id, actualMinutes)
      celebrate(taskCelebration(id))
      return result
    }, 'Done. Progress over perfection.'),
    handleMissed: (id, payload) => run(async () => {
      const result = await api.tasks.missed(id, payload)
      toast(result.message || 'Handled gently.', 'gentle')
      return result
    }),
    createDump: (payload) => run(() => api.braindumps.create(payload), 'Saved. You can organise it later.'),
    updateDump: (id, payload) => run(() => api.braindumps.update(id, payload)),
    removeDump: (id) => run(() => api.braindumps.remove(id), 'Thought released.'),
    convertDump: (id) => run(async () => {
      const result = await api.braindumps.convert(id)
      celebrate('dump-cleared')
      return result
    }, 'Turned into a task, with a small first action.'),
    createRoutine: (payload) => run(() => api.routines.create(payload), 'Routine saved in three versions.'),
    updateRoutine: (id, payload) => run(() => api.routines.update(id, payload), 'Routine updated.'),
    removeRoutine: (id) => run(() => api.routines.remove(id), 'Routine removed.'),
    logRoutine: (id, payload) => run(async () => {
      const result = await api.routines.log(id, payload)
      const logged = routineLogs.filter((log) => log.day === localDateKey()).length + 1
      celebrate(logged >= routines.length && routines.length > 0 ? 'routine-perfect' : 'routine-logged')
      return result
    }, 'Noted. Every version counts.'),
    createEvent: (payload) => run(() => api.events.create(payload), 'Added to your calendar.'),
    updateEvent: (id, payload) => run(() => api.events.update(id, payload), 'Calendar entry updated.'),
    removeEvent: (id) => run(() => api.events.remove(id), 'Calendar entry removed.'),
    clearBlocks: (day) => run(async () => {
      const result = await api.schedule.clear(day)
      toast(result.message || 'Time blocks cleared.', 'gentle')
      return result
    }),
    refreshBlocks: async (day) => {
      const list = await api.schedule.blocks(day)
      setBlocks(list)
      return list
    },
    applySchedule: (payload) => run(async () => {
      const result = await api.schedule.apply(payload)
      await actions.refreshBlocks(payload.day)
      celebrate('schedule-applied')
      return result
    }, 'Plan applied. Your other tasks were left alone.'),
    }
  }, [run, tasks, routines, routineLogs])

  const focus = useMemo(() => ({
    async start({ taskId = null, taskTitle = '', minutes = 25, mode = 'task', label = '', countUp = false }) {
      if (timer) {
        toast('A session is already running. Finish or close it before starting another.', 'gentle')
        return null
      }
      try {
        const session = await api.sessions.create({ task_id: taskId, mode, planned_minutes: minutes })
        const now = Date.now()
        setTimer({
          sessionId: session.id, taskId, taskTitle: taskTitle || label || 'Open focus session', mode,
          plannedMinutes: minutes, remaining: countUp ? 0 : Math.round(minutes * 60), running: true,
          endsAt: countUp ? null : now + minutes * 60000, startedAt: now, distractions: [],
          countUp, breakStarted: countUp,
        })
        if (taskId) await actions.startTask(taskId)
        toast(countUp
          ? 'Counting up from zero. Save whenever you are ready.'
          : (mode === 'task' ? 'You have started. That matters.' : 'Take a soft breath. The break is yours.'), 'gentle')
        return session
      } catch (error) {
        toast(error.message, 'warn')
        return null
      }
    },
    pause() {
      setTimer((current) => {
        if (!current) return current
        if (current.countUp) {
          const elapsed = current.running
            ? Math.max(0, Math.floor((Date.now() - current.startedAt) / 1000))
            : current.remaining
          return { ...current, remaining: elapsed, running: false, endsAt: null, startedAt: Date.now() - elapsed * 1000 }
        }
        return {
          ...current,
          remaining: current.running ? Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000)) : current.remaining,
          running: false, endsAt: null,
        }
      })
    },
    resume() {
      setTimer((current) => current ? (current.countUp
        ? { ...current, running: true, startedAt: Date.now() - current.remaining * 1000, endsAt: null }
        : { ...current, running: true, endsAt: Date.now() + current.remaining * 1000 }) : current)
    },
    addMinutes(minutes) {
      setTimer((current) => current && !current.countUp ? {
        ...current,
        remaining: current.remaining + minutes * 60,
        endsAt: current.running ? (current.endsAt || Date.now()) + minutes * 60000 : null,
        plannedMinutes: current.plannedMinutes + minutes,
      } : current)
    },
    async addDistraction(text) {
      if (!timer) return
      try {
        await api.sessions.distraction(timer.sessionId, text, true)
        setTimer((current) => ({ ...current, distractions: [...(current?.distractions || []), text] }))
        celebrate('distraction-parked')
        toast('Parked for later. You can return to it now.', 'gentle')
      } catch (error) { toast(error.message, 'warn') }
    },
    async finish({ accomplished = '', notes = '', actualMinutes = null, completed = true, recordDuration = true } = {}) {
      if (!timer) return
      const elapsed = Math.max(1, Math.round(((Date.now() - timer.startedAt) / 60000) * 10) / 10)
      const minutes = actualMinutes ?? (timer.countUp
        ? Math.max(0.1, Math.round(((Date.now() - timer.startedAt) / 60000) * 10) / 10)
        : Math.min(timer.plannedMinutes, elapsed))
      try {
        // Do not clear the timer unless the session was actually saved.
        await api.sessions.update(timer.sessionId, {
          actual_minutes: minutes, accomplished, notes, completed, ended_at: new Date().toISOString(),
        }, recordDuration)
        await refresh()
        await refreshInsights()
        const recordedCount = sessions.filter((item) => item.mode === 'task' && item.actual_minutes > 0).length + 1
        const todayMinutes = sessions.filter((item) => (
          item.mode === 'task' && item.actual_minutes > 0
          && localDateKey(item.ended_at || item.started_at) === localDateKey()
        )).reduce((sum, item) => sum + item.actual_minutes, 0) + minutes
        celebrate(todayMinutes >= 60
          ? 'sixty-minutes'
          : (recordedCount === 1 ? 'first-session' : recordedCount === 5 ? 'five-sessions' : 'session-saved'))
        toast('Session saved. Thank you for showing up.')
        setTimer(null)
      } catch (error) {
        toast(`Session was not saved: ${error.message}. Your timer is still here — please try again.`, 'warn')
      }
    },
    async logManual({ taskId = null, minutes = 0 }) {
      if (timer) {
        toast('A session is running. Finish or pause it before logging time.', 'gentle')
        return null
      }
      const value = Number(minutes)
      if (!Number.isFinite(value) || value <= 0) {
        toast('Enter the number of minutes you spent.', 'warn')
        return null
      }
      try {
        const session = await api.sessions.create({ task_id: taskId || null, mode: 'task', planned_minutes: value })
        await api.sessions.update(session.id, {
          actual_minutes: value,
          completed: true,
          ended_at: new Date().toISOString(),
        }, true)
        await refresh()
        await refreshInsights()
        toast('Time saved. That work counts.', 'gentle')
        return session
      } catch (error) {
        toast(`Could not save the time: ${error.message}`, 'warn')
        return null
      }
    },
    discard() {
      setTimer(null)
      toast('Session closed. Nothing was recorded.', 'gentle')
    },
  }), [timer, toast, actions, run, refresh, refreshInsights, sessions])

  // When a focus block reaches zero, save that block and roll straight into a
  // short break. Nothing is left orphaned, and the break session can still be
  // finished or paused by the user at any time.
  useEffect(() => {
    if (!timer || timer.countUp || timer.mode !== 'task' || timer.remaining !== 0 || timer.running || !timer.breakStarted || breakStarting.current) return
    const breakMinutes = Math.max(1, preferences.defaultBreakMinutes || 10)
    breakStarting.current = true
    ;(async () => {
      try {
        await api.sessions.update(timer.sessionId, {
          actual_minutes: Math.max(1, timer.plannedMinutes || 25),
          completed: true,
          ended_at: new Date().toISOString(),
        }, true)
        const session = await api.sessions.create({ mode: 'break', planned_minutes: breakMinutes })
        const now = Date.now()
        setTimer({
          sessionId: session.id, taskId: null, taskTitle: 'A gentle break', mode: 'break',
          plannedMinutes: breakMinutes, remaining: breakMinutes * 60, running: true,
          endsAt: now + breakMinutes * 60000, startedAt: now, distractions: [],
        })
        await refresh()
        await refreshInsights()
        toast('Focus block saved. Take a soft break.', 'gentle')
      } catch (error) {
        toast(`Could not start the break: ${error.message}`, 'warn')
      } finally {
        breakStarting.current = false
      }
    })()
  }, [timer, preferences.defaultBreakMinutes, refresh, refreshInsights, toast])

  const value = {
    ready, mode, user, setUser, preferences, theme, setPreference, setNotificationPreference,
    tasks, braindumps, routines, routineLogs, events, sessions, blocks, insights,
    refresh, refreshInsights, toast, toasts, actions, focus, timer,
    restartOpen, setRestartOpen,
    apiModeLabel: apiState.mode === 'server' ? (user?.is_demo ? 'Demo workspace · sample data' : 'Connected') : 'Local workspace · saved on this device',
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
