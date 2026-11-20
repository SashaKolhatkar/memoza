// Small, local celebrations. No data is stored — these are just visual moments.
export const CELEBRATION_KINDS = [
  'task-done', 'session-saved', 'first-task', 'five-tasks', 'ten-tasks',
  'first-session', 'five-sessions', 'sixty-minutes', 'routine-logged',
  'quest-done', 'level-up', 'dump-cleared', 'distraction-parked',
  'break-done', 'schedule-applied', 'deadline-met', 'routine-perfect',
  'month-goal', 'restart', 'all-clear',
]

export function celebrate(kind, caption = '') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('dayflow:celebrate', { detail: { kind, caption } }))
}
