// Local-first fallback used when the FastAPI service is not running.
// This is real persistence (localStorage), not a static mockup. All records
// created here carry isDemo: true so demo content is never mistaken for real data.

import {
  DEFAULT_PREFERENCES,
  addDays,
  atTime,
  clockMinutes,
  localDateKey,
  minutesToClock,
  todayISO,
  uid,
} from './utils'

const KEY = 'dayflow:local:v1'

const at = (offset, hour, minute = 0) => {
  const date = new Date(`${addDays(todayISO(), offset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
  return date.toISOString()
}

function seed() {
  const user = {
    id: 'local-user',
    email: 'local@memoza.app',
    name: 'Your local workspace',
    is_demo: true,
    preferences: { ...DEFAULT_PREFERENCES },
    created_at: new Date().toISOString(),
  }
  const tasks = [
    {
      id: uid(), user_id: user.id, title: 'Draft the project outline', status: 'today', priority: 'high',
      importance: 5, category: 'work', difficulty_reason: 'quality',
      first_action: 'Open a blank page and write three rough headings.', energy: 'high',
      estimated_minutes: 45, rough_mode: 'rough', done_enough: 'A messy outline with a beginning, middle and end.',
      milestones: [{ id: uid(), title: 'Write rough headings', done: false }, { id: uid(), title: 'Add two bullet points per heading', done: false }],
      tags: [], position: 0, source: 'manual', is_demo: true, pinned: true, is_main_priority: true,
      due_at: at(0, 17), notes: '', created_at: at(-2, 9), completed_at: null, started_at: null, scheduled_start: null, scheduled_end: null,
    },
    {
      id: uid(), user_id: user.id, title: 'Reply to the scheduling email', status: 'today', priority: 'normal',
      importance: 3, category: 'admin', difficulty_reason: 'unmotivated',
      first_action: 'Open the email and write the greeting only.', estimated_minutes: 15,
      tags: [], position: 1, source: 'manual', is_demo: true, pinned: false, is_main_priority: false,
      notes: '', created_at: at(-1, 11), completed_at: null, started_at: null, due_at: null, scheduled_start: null, scheduled_end: null,
      milestones: [], rough_mode: 'off', done_enough: '', energy: 'medium', actual_minutes: null,
    },
    {
      id: uid(), user_id: user.id, title: 'Read chapter 4 of the course book', status: 'today', priority: 'normal',
      importance: 4, category: 'study', difficulty_reason: 'overwhelming',
      first_action: 'Read the first page and note one idea.', estimated_minutes: 35,
      tags: [], position: 2, source: 'manual', is_demo: true, pinned: false, is_main_priority: false,
      notes: '', created_at: at(-1, 12), completed_at: null, started_at: null, due_at: null, scheduled_start: null, scheduled_end: null,
      milestones: [], rough_mode: 'off', done_enough: '', energy: 'medium', actual_minutes: null,
    },
    {
      id: uid(), user_id: user.id, title: 'Plan a gentle evening routine', status: 'today', priority: 'low',
      importance: 2, category: 'personal', first_action: 'Write the first tiny step.', estimated_minutes: 15,
      energy: 'low', tags: [], position: 3, source: 'manual', is_demo: true, pinned: false, is_main_priority: false,
      notes: '', created_at: at(-1, 13), completed_at: null, started_at: null, due_at: null, scheduled_start: null, scheduled_end: null,
      milestones: [], rough_mode: 'off', done_enough: '', difficulty_reason: null, actual_minutes: null,
    },
    {
      id: uid(), user_id: user.id, title: 'Prepare slides for Friday', status: 'upcoming', priority: 'high',
      importance: 4, category: 'work', difficulty_reason: 'unknown', estimated_minutes: 60, due_at: at(2, 12),
      rough_mode: 'good_enough', done_enough: 'Five readable slides, not perfect ones.', tags: [], position: 4,
      source: 'manual', is_demo: true, pinned: false, is_main_priority: false, notes: '', created_at: at(-1, 14),
      completed_at: null, started_at: null, scheduled_start: null, scheduled_end: null, milestones: [], energy: 'high',
      first_action: 'Open the slides and write one rough title.', actual_minutes: null,
    },
    {
      id: uid(), user_id: user.id, title: 'Write a short reflection', status: 'done', priority: 'normal',
      importance: 3, category: 'personal', estimated_minutes: 25, actual_minutes: 20,
      completed_at: at(-1, 16), tags: [], position: 5, source: 'manual', is_demo: true, pinned: false,
      is_main_priority: false, notes: '', created_at: at(-2, 10), started_at: at(-1, 15), due_at: null,
      scheduled_start: null, scheduled_end: null, milestones: [], rough_mode: 'off', done_enough: '',
      difficulty_reason: null, energy: 'medium', first_action: '',
    },
  ]
  const braindumps = [
    { id: uid(), text: 'Ask about the new timeline', category: 'today', parking_lot: false, is_demo: true, created_at: at(0, 8) },
    { id: uid(), text: 'That song I heard on the way home', category: 'ideas', parking_lot: false, is_demo: true, created_at: at(0, 9) },
    { id: uid(), text: 'Look into a better desk lamp', category: 'someday', parking_lot: false, is_demo: true, created_at: at(-1, 20) },
    { id: uid(), text: 'Interesting article about typography', category: 'ideas', parking_lot: true, is_demo: true, created_at: at(0, 10) },
  ]
  const routines = [
    {
      id: uid(), name: 'Morning landing', time_of_day: 'morning', reminder_time: '08:00', optional: false, is_demo: true,
      days: [0, 1, 2, 3, 4, 5, 6],
      full_steps: ['Drink water', 'Open the curtains', "Write today's one priority", 'Five-minute stretch'],
      short_steps: ['Drink water', "Write today's one priority"],
      minimum_steps: ['Sit up and take three breaths'], created_at: at(-10, 8),
    },
    {
      id: uid(), name: 'Evening wind-down', time_of_day: 'evening', reminder_time: '21:00', optional: true, is_demo: true,
      days: [0, 1, 2, 3, 4, 5, 6],
      full_steps: ['Tidy the desk', "Lay out tomorrow's materials", 'Read for ten minutes'],
      short_steps: ["Lay out tomorrow's materials"], minimum_steps: ['Turn off the bright light'], created_at: at(-10, 21),
    },
  ]
  const routineLogs = [
    { id: uid(), routine_id: routines[0].id, version: 'full', day: addDays(todayISO(), -2), completed: true, note: '' },
    { id: uid(), routine_id: routines[0].id, version: 'short', day: addDays(todayISO(), -1), completed: true, note: '' },
    { id: uid(), routine_id: routines[1].id, version: 'minimum', day: addDays(todayISO(), -1), completed: true, note: '' },
  ]
  const events = [
    { id: uid(), title: 'Team check-in', event_type: 'appointment', start_at: at(0, 11), end_at: at(0, 11, 30), prep_minutes: 10, travel_minutes: 0, reminder_minutes: 15, location: 'Video call', notes: '', source: 'manual', is_demo: true },
    { id: uid(), title: 'Outline due', event_type: 'deadline', start_at: at(0, 17), end_at: null, prep_minutes: 0, travel_minutes: 0, reminder_minutes: 60, location: '', notes: '', source: 'manual', is_demo: true },
    { id: uid(), title: 'Study group', event_type: 'appointment', start_at: at(1, 15), end_at: at(1, 16, 30), prep_minutes: 0, travel_minutes: 20, reminder_minutes: 30, location: '', notes: '', source: 'manual', is_demo: true },
  ]
  const sessions = [
    { id: uid(), task_id: tasks[5].id, mode: 'task', planned_minutes: 25, actual_minutes: 20, started_at: at(-1, 15, 30), ended_at: at(-1, 15, 50), accomplished: 'Wrote the first paragraph', notes: '', distractions: [], interruptions: 0, completed: true, is_demo: true },
  ]
  return { user, tasks, braindumps, routines, routineLogs, events, sessions, blocks: [], taskEvents: [] }
}

function seedEmpty() {
  const user = {
    id: 'local-user',
    email: '',
    name: '',
    is_demo: false,
    preferences: { ...DEFAULT_PREFERENCES },
    created_at: new Date().toISOString(),
  }
  return { user, tasks: [], braindumps: [], routines: [], routineLogs: [], events: [], sessions: [], blocks: [], taskEvents: [] }
}

let data
function load() {
  if (data) return data
  try {
    const raw = localStorage.getItem(KEY)
    data = raw ? JSON.parse(raw) : seedEmpty()
  } catch {
    data = seedEmpty()
  }
  if (!data.user) data = seedEmpty()
  return data
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(load()))
}
export function resetLocal() {
  localStorage.removeItem(KEY)
  data = null
  return load()
}

const patch = (object, values) => {
  const result = { ...object }
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) result[key] = value
  })
  return result
}
const find = (collection, id) => collection.find((item) => item.id === id)
const requireItem = (collection, id, label = 'Item') => {
  const item = find(collection, id)
  if (!item) throw new Error(`${label} not found.`)
  return item
}

function logTaskEvent(taskId, eventType, payload = {}) {
  data.taskEvents.unshift({ id: uid(), task_id: taskId, event_type: eventType, payload, created_at: new Date().toISOString() })
}

function baseTask(title, overrides = {}) {
  return {
    id: uid(), user_id: data.user.id, title, notes: '', status: 'today', priority: 'normal', importance: 3,
    category: 'general', difficulty_reason: null, first_action: `Open what you need for ${title} and touch it for two minutes.`,
    energy: 'medium', estimated_minutes: 25, actual_minutes: null, due_at: null, scheduled_start: null,
    scheduled_end: null, pinned: false, is_main_priority: false, rough_mode: 'off', done_enough: '',
    milestones: [], tags: [], position: data.tasks.length, source: 'manual', is_demo: true,
    created_at: new Date().toISOString(), completed_at: null, started_at: null, ...overrides,
  }
}

function tinyAction(title, reason) {
  if (reason === 'quality') return `Make a deliberately rough first pass at ${title}. It only needs to exist.`
  if (reason === 'overwhelming') return `Write down the first three visible parts of ${title}, then stop.`
  if (reason === 'unmotivated') return `Set a 2-minute timer and do the easiest physical movement toward ${title}.`
  if (reason === 'distracted') return `Put your phone away, open only what ${title} needs, and work for one minute.`
  return `Open what you need for ${title} and spend two minutes touching it.`
}

function localSchedule({ day, energy, available_start, available_end, buffer_minutes, break_minutes, max_focus_block, task_ids }) {
  const now = new Date()
  let cursor = Math.max(clockMinutes(available_start), localDateKey(now) === day ? now.getHours() * 60 + now.getMinutes() : 0)
  const end = clockMinutes(available_end)
  const busy = data.events
    .filter((event) => localDateKey(event.start_at) === day)
    .map((event) => ({
      start: new Date(event.start_at).getHours() * 60 + new Date(event.start_at).getMinutes() - (event.prep_minutes || 0) - (event.travel_minutes || 0),
      end: new Date(event.end_at || event.start_at).getHours() * 60 + new Date(event.end_at || event.start_at).getMinutes(),
      label: `${event.title} (including preparation)`,
    }))
  const candidates = data.tasks
    .filter((task) => task.status === 'today' || task.status === 'upcoming')
    .filter((task) => !task_ids || task_ids.includes(task.id))
    .map((task) => {
      let score = (task.importance - 1) * 3 + (task.priority === 'high' ? 7 : 2) + (task.pinned ? 8 : 0)
      const reasons = []
      if (task.due_at) {
        const delta = (new Date(localDateKey(task.due_at)) - new Date(`${day}T12:00:00`)) / 86400000
        if (delta < 0) { score += 12; reasons.push('deadline has passed') }
        else if (delta === 0) { score += 9; reasons.push('deadline is today') }
        else if (delta <= 3) { score += 4; reasons.push('deadline is close') }
      }
      if (task.energy === energy) { score += 3; reasons.push('matches your energy') }
      return { task, score, reason: reasons.join('; ') || 'steady progress toward your goals' }
    })
    .sort((a, b) => b.score - a.score)

  const blocks = []
  const unscheduled = []
  let used = 0
  const budget = Math.max(0, Math.round((end - cursor) * 0.85))
  for (const { task, reason } of candidates) {
    const duration = Math.min(task.estimated_minutes || 25, max_focus_block)
    while (busy.some((b) => cursor >= b.start && cursor < b.end)) {
      const current = busy.find((b) => cursor >= b.start && cursor < b.end)
      cursor = current.end + (buffer_minutes || 0)
    }
    if (used + duration > budget || cursor + duration > end) {
      unscheduled.push({ task_id: task.id, title: task.title, reason: 'Not enough room without overbooking your day. Nothing was moved.' })
      continue
    }
    const start = cursor
    cursor += duration
    used += duration
    blocks.push({
      task_id: task.id, kind: 'task', label: task.title,
      start_at: atTime(day, minutesToClock(start)), end_at: atTime(day, minutesToClock(cursor)), reason,
    })
    cursor += buffer_minutes || 0
    if (break_minutes && used < budget) {
      blocks.push({
        task_id: null, kind: 'break', label: 'Short break',
        start_at: atTime(day, minutesToClock(cursor)), end_at: atTime(day, minutesToClock(cursor + break_minutes)),
        reason: 'A small pause between focus blocks.',
      })
      cursor += break_minutes
    }
  }
  busy.forEach((b) => blocks.push({
    task_id: null, kind: 'event', label: b.label,
    start_at: atTime(day, minutesToClock(Math.max(b.start, clockMinutes(available_start)))),
    end_at: atTime(day, minutesToClock(Math.min(b.end, end))), reason: 'Already in your calendar — kept as a fixed point.',
  }))
  blocks.sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
  return {
    generation_id: uid().slice(0, 16), day, source: 'rule_based', blocks, unscheduled,
    summary: { scheduled_count: blocks.filter((b) => b.kind === 'task').length, focus_minutes: used, unscheduled_count: unscheduled.length, available_minutes: end - cursor, buffer_minutes, energy },
    notes: ['This is a suggestion, not a decision. Tasks stay where they are until you apply the plan.'],
  }
}

export const local = {
  mode: 'local',
  auth: {
    async own() { load(); return { access_token: 'local', user: data.user } },
    async demo() { data = seed(); save(); return { access_token: 'local', user: data.user } },
    async register({ name, email }) {
      load(); data.user = { ...data.user, name, email, is_demo: false }; save()
      return { access_token: 'local', user: data.user }
    },
    async login({ email }) {
      load(); data.user = { ...data.user, email, is_demo: false }; save()
      return { access_token: 'local', user: data.user }
    },
    async me() { return load().user },
    async prefs(preferences) {
      load(); data.user.preferences = { ...data.user.preferences, ...preferences }; save(); return data.user
    },
    async exportData() { load(); return { exported_at: new Date().toISOString(), user: data.user, data } },
    async deleteAccount() { resetLocal(); return { ok: true } },
  },
  tasks: {
    async list({ status, category } = {}) {
      load()
      return data.tasks.filter((task) =>
        (!status || status.split(',').includes(task.status)) && (!category || task.category === category)
      ).sort((a, b) => a.position - b.position)
    },
    async create(payload) {
      load()
      const task = baseTask(payload.title, {
        ...payload,
        first_action: payload.first_action || tinyAction(payload.title, payload.difficulty_reason),
      })
      data.tasks.push(task); logTaskEvent(task.id, 'created'); save(); return task
    },
    async update(id, payload) {
      load()
      const task = requireItem(data.tasks, id, 'Task')
      Object.assign(task, payload)
      if (payload.status === 'done' && !task.completed_at) task.completed_at = new Date().toISOString()
      if (payload.status && payload.status !== 'done') task.completed_at = null
      logTaskEvent(id, 'updated', { fields: Object.keys(payload) }); save(); return task
    },
    async remove(id) { load(); data.tasks = data.tasks.filter((task) => task.id !== id); save(); return { ok: true } },
    async start(id) {
      load(); const task = requireItem(data.tasks, id, 'Task')
      task.started_at = task.started_at || new Date().toISOString(); task.status = 'today'
      logTaskEvent(id, 'started'); save(); return task
    },
    async complete(id, actualMinutes) {
      load(); const task = requireItem(data.tasks, id, 'Task')
      task.status = 'done'; task.completed_at = new Date().toISOString()
      if (actualMinutes != null) task.actual_minutes = actualMinutes
      logTaskEvent(id, 'completed', { actual_minutes: actualMinutes }); save(); return task
    },
    async reorder(ids) {
      load(); ids.forEach((id, index) => { const task = find(data.tasks, id); if (task) task.position = index }); save(); return data.tasks
    },
    async events(id) { load(); return data.taskEvents.filter((event) => event.task_id === id) },
    async assist(title, difficulty_reason) {
      const reason = difficulty_reason || 'unknown'
      return {
        first_action: tinyAction(title, reason),
        explanation: {
          unknown: 'Clarity comes from moving, not from figuring everything out first.',
          overwhelming: "We don't need the whole task today — only one piece small enough to feel doable.",
          quality: 'A rough version can always be improved. For now, the goal is simply to make something exist.',
          unmotivated: "You don't have to feel ready. Two quiet minutes is enough to get the wheels turning.",
          distracted: "Let's make the next two minutes small and protected.",
        }[reason],
        reason_label: {
          unknown: "I don't know where to begin", overwhelming: 'The task feels overwhelming',
          quality: "I'm worried the result won't be good enough", unmotivated: "I don't feel motivated",
          distracted: 'I keep getting distracted',
        }[reason] || "I don't know where to begin",
        options: [
          { id: 'two_minutes', label: 'Start for 2 minutes', minutes: 2, icon: 'timer' },
          { id: 'five_minutes', label: 'Start for 5 minutes', minutes: 5, icon: 'timer' },
          { id: 'break_down', label: 'Break task into smaller actions', minutes: 3, icon: 'list' },
          { id: 'open_materials', label: 'Open task materials', minutes: 2, icon: 'folder' },
          { id: 'continue', label: 'Continue, pause, or save progress', minutes: 0, icon: 'save' },
        ],
      }
    },
    async missed(id, payload) {
      load(); const task = requireItem(data.tasks, id, 'Task')
      let message = ''
      if (payload.action === 'reschedule') { task.scheduled_start = null; task.scheduled_end = null; task.status = 'today'; message = 'Kept for today, with no fixed time.' }
      if (payload.action === 'reduce_scope') { task.estimated_minutes = Math.max(10, Math.round((task.estimated_minutes || 25) / 2)); task.status = 'today'; message = 'Scope reduced to a smaller first piece.' }
      if (payload.action === 'move_to_another_day') {
        const day = payload.target_date || addDays(todayISO(), 1)
        const start = new Date(`${day}T10:00:00`)
        task.scheduled_start = start.toISOString()
        task.scheduled_end = new Date(start.getTime() + (task.estimated_minutes || 25) * 60000).toISOString()
        task.status = 'upcoming'; message = `Moved only this task to ${day}.`
      }
      if (payload.action === 'break_down') {
        task.status = 'upcoming'
        const titles = (task.milestones || []).map((m) => m.title).slice(0, 3)
        const parts = titles.length ? titles : [task.first_action || `Start ${task.title}`, `Continue ${task.title}`]
        parts.forEach((title, index) => data.tasks.push(baseTask(title, { status: 'today', source: 'break_down', tags: [id], position: data.tasks.length + index })))
        message = `Created ${parts.length} smaller actions. The original is unchanged.`
      }
      if (payload.action === 'remove') { task.status = 'archived'; message = 'Removed from your active list. Nothing was deleted.' }
      logTaskEvent(id, `missed_${payload.action}`, { message }); save(); return { message, task }
    },
  },
  braindumps: {
    async list({ category, parking_lot } = {}) {
      load()
      return data.braindumps.filter((item) => (!category || item.category === category) && (parking_lot === undefined || item.parking_lot === parking_lot))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    },
    async create(payload) { load(); const item = { id: uid(), converted_task_id: null, is_demo: true, created_at: new Date().toISOString(), ...payload }; data.braindumps.unshift(item); save(); return item },
    async update(id, payload) { load(); const item = requireItem(data.braindumps, id); Object.assign(item, payload); save(); return item },
    async remove(id) { load(); data.braindumps = data.braindumps.filter((item) => item.id !== id); save(); return { ok: true } },
    async convert(id) {
      load(); const item = requireItem(data.braindumps, id)
      if (item.converted_task_id && find(data.tasks, item.converted_task_id)) return find(data.tasks, item.converted_task_id)
      const status = { today: 'today', upcoming: 'upcoming', reminders: 'upcoming', ideas: 'someday', someday: 'someday' }[item.category] || 'someday'
      const task = baseTask(item.text.slice(0, 400), { status, source: 'brain_dump', first_action: tinyAction(item.text) })
      data.tasks.push(task); item.converted_task_id = task.id; save(); return task
    },
  },
  routines: {
    async list() { load(); return data.routines },
    async create(payload) { load(); const routine = { id: uid(), is_demo: true, created_at: new Date().toISOString(), ...payload }; data.routines.push(routine); save(); return routine },
    async update(id, payload) { load(); const routine = requireItem(data.routines, id); Object.assign(routine, payload); save(); return routine },
    async remove(id) { load(); data.routines = data.routines.filter((r) => r.id !== id); save(); return { ok: true } },
    async log(routineId, payload) {
      load()
      let item = data.routineLogs.find((log) => log.routine_id === routineId && log.day === payload.day && log.version === payload.version)
      if (item) Object.assign(item, payload)
      else { item = { id: uid(), routine_id: routineId, ...payload }; data.routineLogs.push(item) }
      save(); return item
    },
    async logs() { load(); return data.routineLogs },
  },
  events: {
    async list() { load(); return [...data.events].sort((a, b) => new Date(a.start_at) - new Date(b.start_at)) },
    async create(payload) { load(); const event = { id: uid(), source: 'manual', is_demo: true, ...payload }; data.events.push(event); save(); return event },
    async update(id, payload) { load(); Object.assign(requireItem(data.events, id), payload); save(); return requireItem(data.events, id) },
    async remove(id) { load(); data.events = data.events.filter((e) => e.id !== id); save(); return { ok: true } },
    async upcoming(limit = 6) {
      load()
      const events = data.events.map((e) => ({ id: e.id, kind: 'event', title: e.title, at: e.start_at, meta: e.event_type, prep_minutes: (e.prep_minutes || 0) + (e.travel_minutes || 0) }))
      const deadlines = data.tasks.filter((t) => t.due_at && t.status !== 'done').map((t) => ({ id: t.id, kind: 'deadline', title: t.title, at: t.due_at, meta: 'task deadline', prep_minutes: 0 }))
      return [...events, ...deadlines].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(0, limit)
    },
  },
  sessions: {
    async list() { load(); return [...data.sessions].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)) },
    async create(payload) {
      load()
      const session = { id: uid(), actual_minutes: 0, ended_at: null, accomplished: '', notes: '', distractions: [], interruptions: 0, completed: false, is_demo: true, started_at: new Date().toISOString(), ...payload }
      data.sessions.unshift(session)
      if (payload.task_id) { const task = find(data.tasks, payload.task_id); if (task) task.started_at = task.started_at || session.started_at }
      save(); return session
    },
    async update(id, payload, recordDuration = true) {
      load(); const session = requireItem(data.sessions, id)
      Object.assign(session, payload)
      if (payload.completed && !session.ended_at) session.ended_at = new Date().toISOString()
      if (recordDuration && session.mode === 'task' && session.actual_minutes > 0) {
        const task = find(data.tasks, session.task_id)
        if (task) { task.actual_minutes = session.actual_minutes; logTaskEvent(task.id, 'duration_recorded', { minutes: session.actual_minutes }) }
      }
      save(); return session
    },
    async distraction(id, text, park = true) {
      load(); const session = requireItem(data.sessions, id)
      session.distractions = [...(session.distractions || []), text]
      session.interruptions = (session.interruptions || 0) + 1
      if (park) data.braindumps.unshift({ id: uid(), text, category: 'ideas', parking_lot: true, converted_task_id: null, is_demo: true, created_at: new Date().toISOString() })
      save(); return session
    },
  },
  schedule: {
    async preview(options) { load(); return localSchedule(options) },
    async apply(payload) {
      load()
      // Match server behaviour: a day's previous plan is replaced, not stacked.
      const day = payload.day || (payload.blocks?.[0]?.start_at ? localDateKey(payload.blocks[0].start_at) : null)
      data.blocks = day
        ? data.blocks.filter((block) => localDateKey(block.start_at) !== day)
        : data.blocks.filter((block) => block.generation_id !== payload.generation_id)
      payload.blocks.forEach((block) => {
        data.blocks.push({ id: uid(), generation_id: payload.generation_id, ...block })
        if (payload.apply_task_times && block.task_id && block.kind === 'task') {
          const task = find(data.tasks, block.task_id)
          if (task) { task.scheduled_start = block.start_at; task.scheduled_end = block.end_at }
        }
      })
      save(); return data.blocks
    },
    async blocks(day) { load(); return data.blocks.filter((b) => localDateKey(b.start_at) === day).sort((a, b) => new Date(a.start_at) - new Date(b.start_at)) },
    async clear(day) { load(); data.blocks = data.blocks.filter((b) => localDateKey(b.start_at) !== day); save(); return { message: 'Cleared time blocks for this day. Your tasks were not changed.' } },
  },
  restart: {
    async rebuild(options) { return localSchedule({ ...options, buffer_minutes: 10, break_minutes: 10, max_focus_block: 50 }) },
    async priorities(limit = 3) {
      load()
      return data.tasks.filter((t) => t.status !== 'done' && t.status !== 'archived')
        .map((task) => {
          let score = (task.importance - 1) * 3 + (task.priority === 'high' ? 7 : 0) + (task.pinned ? 5 : 0)
          const reasons = []
          if (task.due_at) {
            const delta = (new Date(localDateKey(task.due_at)) - new Date(`${todayISO()}T12:00:00`)) / 86400000
            if (delta <= 0) { score += 10; reasons.push(delta < 0 ? 'deadline has passed' : 'deadline is today') }
            else if (delta <= 3) { score += 3; reasons.push('deadline is close') }
          }
          if (task.estimated_minutes <= 25) { score += 2; reasons.push('small enough to start today') }
          return { task_id: task.id, title: task.title, reason: reasons.join('; ') || 'a steady step forward', first_action: task.first_action, score }
        })
        .sort((a, b) => b.score - a.score).slice(0, limit)
    },
    async getStarted(taskId) {
      load()
      const ranked = await local.restart.priorities(1)
      const task = (taskId && find(data.tasks, taskId)) || (ranked[0] && find(data.tasks, ranked[0].task_id))
      if (!task) return { task: null, assist: await local.tasks.assist('Add one small thing you would like to do today', 'unknown'), message: 'There is no open task yet. Here is a gentle place to begin.' }
      return { task: { id: task.id, title: task.title, first_action: task.first_action }, assist: await local.tasks.assist(task.title, task.difficulty_reason), message: 'One tiny action is enough for now.' }
    },
  },
  insights: {
    async get() {
      load()
      const sessions = data.sessions.filter((s) => s.mode === 'task')
      const completed = data.tasks.filter((t) => t.status === 'done')
      const accuracyRows = completed.filter((t) => t.actual_minutes && t.estimated_minutes).map((t) => Math.min(3, t.actual_minutes / t.estimated_minutes))
      return {
        model_status: { available: false, training_samples: accuracyRows.length + sessions.length, required_samples: 20, source: 'rule_based', message: 'Local workspace uses transparent rules. Connect the API to train a personal model.' },
        total_sessions: sessions.length,
        total_tasks_completed: completed.length,
        average_estimate_accuracy: accuracyRows.length ? Number((accuracyRows.reduce((a, b) => a + b, 0) / accuracyRows.length).toFixed(2)) : null,
        total_focus_minutes: sessions.reduce((sum, s) => sum + s.actual_minutes, 0),
        duration_history: sessions.filter((s) => s.actual_minutes > 0).slice(-40).map((s) => ({ date: localDateKey(s.ended_at || s.started_at), planned: s.planned_minutes, actual: s.actual_minutes, label: 'Focus session' })),
        category_breakdown: Object.entries(completed.reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + 1 }), {})).map(([category, count]) => ({ category, count })),
        routine_consistency: data.routines.map((r) => ({ name: r.name, completed: data.routineLogs.filter((l) => l.routine_id === r.id && l.completed).length, versions: {} })),
        recommendations: [{ type: 'getting_started', title: 'Record what actually happened', body: 'After a focus session, note how long it took. That is what makes future plans more realistic.', source: 'historical_rule' }],
      }
    },
    async predict(payload) {
      load()
      const bases = { general: 25, work: 35, study: 40, creative: 45, technical: 50, admin: 15, personal: 20, health: 20 }
      let minutes = bases[payload.category] || 25
      minutes *= 1 + ((payload.importance || 3) - 3) * 0.12
      if (payload.rough_mode === 'rough') minutes *= 0.75
      minutes = Math.round(Math.max(5, Math.min(240, minutes)) / 5) * 5
      return { minutes, source: 'rule_based', confidence: 'low', basis: 'A transparent rule of thumb from task type and importance. No personal model has been trained locally.', training_samples: 0 }
    },
    async train() { return { trained: false, reason: 'Training requires the FastAPI backend and 20 recorded durations.' } },
  },
  google: {
    async status() { return { configured: false, connected: false, email: null, message: 'Google Calendar needs the FastAPI backend with OAuth credentials.' } },
    async connect() { throw new Error('Google Calendar needs the FastAPI backend with OAuth credentials.') },
    async disconnect() { return { message: 'No connection to remove in local mode.' } },
    async importEvents() { throw new Error('Google Calendar needs the FastAPI backend with OAuth credentials.') },
  },
}
