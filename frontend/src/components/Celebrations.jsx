import { useEffect, useRef, useState } from 'react'
import { CELEBRATION_KINDS } from '../lib/celebrate'

const CAPTIONS = {
  'task-done': 'Task done — nicely done.',
  'session-saved': 'Session saved.',
  'first-task': 'Your first finished task.',
  'five-tasks': 'Five tasks finished.',
  'ten-tasks': 'Ten tasks finished.',
  'first-session': 'Your first focus session.',
  'five-sessions': 'Five focus sessions.',
  'sixty-minutes': 'An hour of focus.',
  'routine-logged': 'Routine checked in.',
  'quest-done': 'Quest complete.',
  'level-up': 'A new level.',
  'dump-cleared': 'A thought turned into a step.',
  'distraction-parked': 'Safely parked.',
  'break-done': 'Break finished.',
  'schedule-applied': 'A gentler plan is in place.',
  'deadline-met': 'Deadline met.',
  'routine-perfect': 'Every routine checked in.',
  'month-goal': 'A good month so far.',
  restart: 'A fresh start.',
  'all-clear': 'Everything on today is done.',
}

const bits = (count) => Array.from({ length: count }, (_, index) => (
  <i key={index} style={{ '--i': index }} />
))

const MOTIFS = {
  'task-done': () => <span className="c-confetti">{bits(14)}</span>,
  'session-saved': () => <span className="c-check">✓</span>,
  'first-task': () => <span className="c-star">★</span>,
  'five-tasks': () => <span className="c-sparkles">{bits(9)}</span>,
  'ten-tasks': () => <span className="c-trophy">🏆</span>,
  'first-session': () => <span className="c-rocket">🚀</span>,
  'five-sessions': () => <span className="c-medal">🏅</span>,
  'sixty-minutes': () => <span className="c-sun">{bits(12)}<b>☀</b></span>,
  'routine-logged': () => <span className="c-leaves">{bits(7)}</span>,
  'quest-done': () => <span className="c-ribbon">{bits(3)}</span>,
  'level-up': () => <span className="c-crown">♛</span>,
  'dump-cleared': () => <span className="c-balloons">{bits(4)}</span>,
  'distraction-parked': () => <span className="c-bubbles">{bits(8)}</span>,
  'break-done': () => <span className="c-petals">{bits(10)}</span>,
  'schedule-applied': () => <span className="c-comet">{bits(6)}</span>,
  'deadline-met': () => <span className="c-bell">🔔</span>,
  'routine-perfect': () => <span className="c-rainbow">{bits(5)}</span>,
  'month-goal': () => <span className="c-firework">{bits(16)}</span>,
  restart: () => <span className="c-bloom">{bits(8)}</span>,
  'all-clear': () => <span className="c-cannon">{bits(18)}</span>,
}

export default function Celebrations() {
  const [active, setActive] = useState(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const onCelebrate = (event) => {
      const { kind, caption } = event.detail || {}
      const safeKind = CELEBRATION_KINDS.includes(kind) ? kind : 'task-done'
      setActive({ id: Date.now() + Math.random(), kind: safeKind, caption })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setActive(null), 2600)
    }
    window.addEventListener('dayflow:celebrate', onCelebrate)
    return () => {
      window.removeEventListener('dayflow:celebrate', onCelebrate)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!active) return null

  return (
    <div className="celebration-layer" aria-live="polite">
      <div key={active.id} className={`celebration celeb-${active.kind}`}>
        <div className="celeb-art">{MOTIFS[active.kind]()}</div>
        <span className="celeb-caption">{active.caption || CAPTIONS[active.kind]}</span>
      </div>
    </div>
  )
}
