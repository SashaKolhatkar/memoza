export const cx = (...parts) => parts.filter(Boolean).join(' ')

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`).replace(/-/g, '').slice(0, 24)

export const todayISO = () => localDateKey(new Date())

export const tomorrowISO = () => addDays(todayISO(), 1)

export function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISO(value) {
  if (!value) return null
  return new Date(value.length === 16 || value.length === 19 ? value : value)
}

export function addDays(key, count) {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + count)
  return localDateKey(date)
}

export function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDate(value, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, options)
}

export function relativeDay(value) {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const diff = Math.round((new Date(localDateKey(date)) - new Date(localDateKey(today))) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  return formatDate(date)
}

export function minutesLabel(minutes) {
  const value = Math.round(minutes || 0)
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function clockMinutes(value = '09:00') {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export function minutesToClock(total) {
  const wrapped = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

export function atTime(day, clock) {
  return new Date(`${day}T${clock}:00`).toISOString()
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    acc[key] = [...(acc[key] || []), item]
    return acc
  }, {})
}

export function sortByTime(items, key = 'start_at') {
  return [...items].sort((a, b) => new Date(a[key]) - new Date(b[key]))
}

export function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export const DIFFICULTIES = [
  { id: 'unknown', label: "I don't know where to begin", emoji: '🌱' },
  { id: 'overwhelming', label: 'The task feels overwhelming', emoji: '🫧' },
  { id: 'quality', label: "I'm worried the result won't be good enough", emoji: '🪶' },
  { id: 'unmotivated', label: "I don't feel motivated", emoji: '☁️' },
  { id: 'distracted', label: 'I keep getting distracted', emoji: '🍃' },
]

export const ROUGH_MODES = [
  {
    id: 'rough', label: 'Rough Draft', icon: 'PenLine',
    description: 'Create an imperfect first version without judging it.',
    guidance: 'Make something exist first. Do not reread, judge, or fix it yet — a messy first pass is the whole goal.',
    done_enough_prompt: 'What would count as a first version existing, even if it is messy?',
  },
  {
    id: 'good_enough', label: 'Good Enough', icon: 'Target',
    description: 'Define a realistic finish line before you begin.',
    guidance: 'Decide what “good enough” means before you start, so the finish line stays still while you work.',
    done_enough_prompt: 'Describe a realistic result you would be happy to hand in today.',
  },
  {
    id: 'polish_later', label: 'Polish Later', icon: 'Sparkles',
    description: 'Leave editing for a separate, dedicated session.',
    guidance: 'Editing is a separate job. For this session, leave the rough edges alone and save improvement for another time.',
    done_enough_prompt: 'What can stay imperfect for now without causing a problem?',
  },
]

// Contact and donation enquiries go to the site owner.
export const SUPPORT_EMAIL = 'sashakolhatkar28@gmail.com'

export const DEFAULT_PREFERENCES = {
  theme: 'light',
  reduceMotion: false,
  gentleReminders: true,
  breakReminders: true,
  defaultSessionMinutes: 25,
  defaultBreakMinutes: 10,
  buddyName: '',
  buddyCharacter: 'auto',
  buddyColor: 'default',
  musicEnabled: false,
  musicSource: 'audio',
  musicAudioId: 'senbazuru',
  musicVideoId: 'KNdjMEcG0mw',
  notificationPreferences: { tasks: true, events: true, routines: false, sound: false },
}
