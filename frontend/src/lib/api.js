import { local } from './localStore'

export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')
const BASE = API_BASE
const TOKEN_KEY = 'dayflow:token'

let mode = 'local'
let token = localStorage.getItem(TOKEN_KEY)
let serverAvailable = false

export const apiState = {
  get mode() { return mode },
  get token() { return token },
  get serverAvailable() { return serverAvailable },
}

function query(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  })
  const string = search.toString()
  return string ? `?${string}` : ''
}

async function request(method, path, { body, params } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(`${BASE}${path}${query(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    throw new Error(`Cannot reach Memoza API. ${error.message}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = text }
  if (!response.ok) {
    const detail = payload?.detail || payload?.message || `Request failed (${response.status}).`
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return payload
}

function setSession(result) {
  token = result.access_token
  if (token && token !== 'local') localStorage.setItem(TOKEN_KEY, token)
  return result
}

export const api = {
  async init() {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3000)
      const response = await fetch(`${BASE}/health`, { signal: controller.signal })
      clearTimeout(timer)
      if (!response.ok) throw new Error('unhealthy')
      serverAvailable = true
      mode = 'server'
      if (token) {
        try {
          const user = await request('GET', '/auth/me')
          return { mode, user }
        } catch {
          token = null
          localStorage.removeItem(TOKEN_KEY)
        }
      }
      // No saved session: use an empty private workspace instead of silently
      // entering a demo account. The user can add their own data, or sign in
      // or create an account from Settings at any time.
      mode = 'local'
      const session = await local.auth.own()
      return { mode, user: session.user }
    } catch {
      serverAvailable = false
      mode = 'local'
      const session = await local.auth.own()
      return { mode, user: session.user }
    }
  },

  auth: {
    demo: () => (serverAvailable ? request('POST', '/auth/demo').then((result) => { mode = 'server'; return setSession(result) }) : local.auth.demo()),
    login: (payload) => (serverAvailable ? request('POST', '/auth/login', { body: payload }).then((result) => { mode = 'server'; return setSession(result) }) : local.auth.login(payload)),
    register: (payload) => (serverAvailable ? request('POST', '/auth/register', { body: payload }).then((result) => { mode = 'server'; return setSession(result) }) : local.auth.register(payload)),
    me: () => (mode === 'server' ? request('GET', '/auth/me') : local.auth.me()),
    prefs: (preferences) => (mode === 'server' ? request('PATCH', '/auth/me/preferences', { body: { preferences } }) : local.auth.prefs(preferences)),
    exportData: () => (mode === 'server' ? request('GET', '/auth/export') : local.auth.exportData()),
    deleteAccount: () => (mode === 'server' ? request('DELETE', '/auth/me') : local.auth.deleteAccount()),
    logout() {
      token = null
      localStorage.removeItem(TOKEN_KEY)
    },
  },

  tasks: {
    list: (params) => (mode === 'server' ? request('GET', '/tasks', { params }) : local.tasks.list(params)),
    create: (payload) => (mode === 'server' ? request('POST', '/tasks', { body: payload }) : local.tasks.create(payload)),
    update: (id, payload) => (mode === 'server' ? request('PATCH', `/tasks/${id}`, { body: payload }) : local.tasks.update(id, payload)),
    remove: (id) => (mode === 'server' ? request('DELETE', `/tasks/${id}`) : local.tasks.remove(id)),
    start: (id) => (mode === 'server' ? request('POST', `/tasks/${id}/start`) : local.tasks.start(id)),
    complete: (id, actualMinutes) => (mode === 'server' ? request('POST', `/tasks/${id}/complete`, { params: { actual_minutes: actualMinutes } }) : local.tasks.complete(id, actualMinutes)),
    reorder: (ids) => (mode === 'server' ? request('POST', '/tasks/reorder', { body: { ids } }) : local.tasks.reorder(ids)),
    events: (id) => (mode === 'server' ? request('GET', `/tasks/${id}/events`) : local.tasks.events(id)),
    assist: (title, difficulty_reason) => (mode === 'server' ? request('GET', '/tasks/assist', { params: { title, difficulty_reason } }) : local.tasks.assist(title, difficulty_reason)),
    missed: (id, payload) => (mode === 'server' ? request('POST', `/tasks/${id}/missed`, { body: payload }) : local.tasks.missed(id, payload)),
  },

  braindumps: {
    list: (params) => (mode === 'server' ? request('GET', '/braindumps', { params }) : local.braindumps.list(params)),
    create: (payload) => (mode === 'server' ? request('POST', '/braindumps', { body: payload }) : local.braindumps.create(payload)),
    update: (id, payload) => (mode === 'server' ? request('PATCH', `/braindumps/${id}`, { body: payload }) : local.braindumps.update(id, payload)),
    remove: (id) => (mode === 'server' ? request('DELETE', `/braindumps/${id}`) : local.braindumps.remove(id)),
    convert: (id) => (mode === 'server' ? request('POST', `/braindumps/${id}/convert`) : local.braindumps.convert(id)),
  },

  routines: {
    list: () => (mode === 'server' ? request('GET', '/routines') : local.routines.list()),
    create: (payload) => (mode === 'server' ? request('POST', '/routines', { body: payload }) : local.routines.create(payload)),
    update: (id, payload) => (mode === 'server' ? request('PATCH', `/routines/${id}`, { body: payload }) : local.routines.update(id, payload)),
    remove: (id) => (mode === 'server' ? request('DELETE', `/routines/${id}`) : local.routines.remove(id)),
    log: (id, payload) => (mode === 'server' ? request('POST', `/routines/${id}/log`, { body: payload }) : local.routines.log(id, payload)),
    logs: (params) => (mode === 'server' ? request('GET', '/routines/logs', { params }) : local.routines.logs(params)),
  },

  events: {
    list: (params) => (mode === 'server' ? request('GET', '/events', { params }) : local.events.list(params)),
    create: (payload) => (mode === 'server' ? request('POST', '/events', { body: payload }) : local.events.create(payload)),
    update: (id, payload) => (mode === 'server' ? request('PATCH', `/events/${id}`, { body: payload }) : local.events.update(id, payload)),
    remove: (id) => (mode === 'server' ? request('DELETE', `/events/${id}`) : local.events.remove(id)),
    upcoming: (limit = 6) => (mode === 'server' ? request('GET', '/events/upcoming', { params: { limit } }) : local.events.upcoming(limit)),
  },

  sessions: {
    list: () => (mode === 'server' ? request('GET', '/sessions') : local.sessions.list()),
    create: (payload) => (mode === 'server' ? request('POST', '/sessions', { body: payload }) : local.sessions.create(payload)),
    update: (id, payload, recordDuration = true) => (mode === 'server' ? request('PATCH', `/sessions/${id}`, { body: payload, params: { record_duration: recordDuration } }) : local.sessions.update(id, payload, recordDuration)),
    distraction: (id, text, park = true) => (mode === 'server' ? request('POST', `/sessions/${id}/distractions`, { body: { text }, params: { park } }) : local.sessions.distraction(id, text, park)),
  },

  schedule: {
    preview: (payload) => (mode === 'server' ? request('POST', '/schedule/preview', { body: payload }) : local.schedule.preview(payload)),
    apply: (payload) => (mode === 'server' ? request('POST', '/schedule/apply', { body: payload }) : local.schedule.apply(payload)),
    blocks: (day) => (mode === 'server' ? request('GET', '/schedule/blocks', { params: { day } }) : local.schedule.blocks(day)),
    clear: (day) => (mode === 'server' ? request('DELETE', '/schedule/blocks', { params: { day } }) : local.schedule.clear(day)),
  },

  restart: {
    rebuild: (payload) => (mode === 'server' ? request('POST', '/restart/rebuild', { body: payload }) : local.restart.rebuild(payload)),
    priorities: (limit = 3) => (mode === 'server' ? request('GET', '/restart/choose-priority', { params: { limit } }) : local.restart.priorities(limit)),
    getStarted: (taskId) => (mode === 'server' ? request('GET', '/restart/get-started', { params: { task_id: taskId } }) : local.restart.getStarted(taskId)),
  },

  insights: {
    get: () => (mode === 'server' ? request('GET', '/insights') : local.insights.get()),
    predict: (payload) => (mode === 'server' ? request('POST', '/insights/predict-duration', { body: payload }) : local.insights.predict(payload)),
    train: () => (mode === 'server' ? request('POST', '/insights/train') : local.insights.train()),
  },

  traffic: {
    view: (payload) => (mode === 'server' ? request('POST', '/traffic/view', { body: payload }) : Promise.resolve({ ok: true, counted: false })),
  },

  owner: {
    traffic: (days = 30) => (mode === 'server'
      ? request('GET', '/owner/traffic', { params: { days } })
      : Promise.resolve({
        summary: { views: 0, unique_visitors: 0, unique_sessions: 0, days_with_views: 0, first_view: null, last_view: null },
        daily: [], pages: [], devices: [], referrers: [], recent: [],
        note: 'Traffic monitoring needs the deployed API. Local browser mode records nothing.',
      })),
  },

  google: {
    status: () => (mode === 'server' ? request('GET', '/google/status') : local.google.status()),
    connect: () => (mode === 'server' ? request('GET', '/google/connect') : local.google.connect()),
    disconnect: () => (mode === 'server' ? request('POST', '/google/disconnect') : local.google.disconnect()),
    importEvents: () => (mode === 'server' ? request('POST', '/google/import') : local.google.importEvents()),
  },
}
