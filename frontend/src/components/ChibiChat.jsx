import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eraser, MessageCircle, Send, X } from 'lucide-react'
import ChibiCompanion, { buddyNameFor } from './ChibiCompanion'
import { useApp } from '../context/AppContext'
import { minutesLabel, todayISO } from '../lib/utils'

const FRIENDS = {
  down: { name: 'Milo', line: 'right here', title: 'I’m here with you' },
  evening: { name: 'Lumi', line: 'tucking in the day', title: 'Let’s put it down gently' },
  cheer: { name: 'Pip', line: 'your tiny cheerleader', title: 'Hey, you made it' },
}

const QUICK_NOTES = [
  { id: 'low', label: 'Having a rough moment', text: 'I’m having a rough moment.' },
  { id: 'evening', label: 'Let’s close the day', text: 'It’s the end of the day.' },
  { id: 'cheer', label: 'Cheer me on', text: 'Can you cheer me on?' },
  { id: 'summary', label: 'What did I do?', text: 'What did I do today?' },
  { id: 'chat', label: 'Just sit with me', text: 'Can you just sit with me?' },
]

const EMPTY_MEMORY = { name: '', topics: {}, actions: {}, notes: 0, messages: [] }

function dayKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function detectIntent(text) {
  const value = text.toLowerCase()
  if (/end of (the )?day|wrap up|close the day|good night|evening|tired|tuck/.test(value)) return 'evening'
  if (/low|sad|down|stuck|overwhelm|hard|rough|anxious|lonely|bad|heavy|not okay|meh/.test(value)) return 'low'
  if (/what did i|progress|summary|record|done today|how did i/.test(value)) return 'summary'
  if (/start|focus|begin|two minutes|2 minutes/.test(value)) return 'start'
  if (/cheer|motivat|encourag|happy|good|thanks/.test(value)) return 'cheer'
  if (/sit|stay|here with|listen/.test(value)) return 'sit'
  return 'chat'
}

function greetingFor(name, buddyName) {
  return {
    id: 'hello',
    from: 'buddy',
    mood: 'cheer',
    text: `Hi${name ? `, ${name}` : ''}, I’m ${buddyName} — glad you’re here. I can see what Memoza has recorded, and I remember what you tell me in this browser. Nothing leaves your device.`,
  }
}

function loadMemory(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null')
    if (saved && typeof saved === 'object') {
      return {
        ...EMPTY_MEMORY,
        ...saved,
        topics: { ...EMPTY_MEMORY.topics, ...(saved.topics || {}) },
        actions: { ...EMPTY_MEMORY.actions, ...(saved.actions || {}) },
        messages: Array.isArray(saved.messages) ? saved.messages : [],
      }
    }
  } catch { /* a fresh memory is always safe */ }
  return { ...EMPTY_MEMORY, topics: {}, actions: {}, messages: [] }
}

function replyFor(intent, stats, memory, name) {
  const hey = name ? `Hey, ${name}` : 'Hey'
  const taskWord = stats.done === 1 ? 'task' : 'tasks'
  const sessionWord = stats.sessions === 1 ? 'session' : 'sessions'
  const routineWord = stats.routines === 1 ? 'routine' : 'routines'
  const lowCount = memory.topics?.low || 0
  const prefersRest = (memory.actions?.rest || 0) > (memory.actions?.start || 0)

  if (intent === 'low') {
    const remember = lowCount >= 3
      ? ' We’ve had a few of these moments together, and we got through each one.'
      : ''
    if (stats.sessions > 0) {
      return {
        mood: 'down',
        text: `${hey}, I’m really glad you told me. You already showed up for ${stats.sessions} focus ${sessionWord} today — that counts, even if the rest feels heavy.${remember}`,
        action: prefersRest
          ? { label: 'Rest with me', kind: 'close' }
          : { label: 'Two quiet minutes', kind: 'start' },
      }
    }
    if (stats.done > 0) {
      return {
        mood: 'down',
        text: `${hey}, I’m glad you said something. You finished ${stats.done} ${taskWord} today — that's not nothing. You don't have to earn a break, okay?${remember}`,
        action: prefersRest
          ? { label: 'Rest with me', kind: 'close' }
          : { label: 'Two quiet minutes', kind: 'start' },
      }
    }
    return {
      mood: 'down',
      text: `${hey}, I’m here. Nothing’s recorded yet, and that’s totally okay. We can sit here a sec, or do two quiet minutes if that feels good.${remember}`,
      action: prefersRest
        ? { label: 'Rest with me', kind: 'close' }
        : { label: 'Let’s do 2 minutes', kind: 'start' },
    }
  }

  if (intent === 'evening') {
    return {
      mood: 'evening',
      text: `Okay, let’s put the day down gently. You finished ${stats.done} ${taskWord}, spent ${minutesLabel(stats.minutes)} in focus, and checked in with ${stats.routines} ${routineWord}. That's plenty to notice.`,
      action: { label: 'Tuck the day in', kind: 'close' },
    }
  }

  if (intent === 'summary') {
    return {
      mood: 'cheer',
      text: `Here's what I can see from what you actually recorded today: ${stats.done} finished ${taskWord}, ${stats.sessions} focus ${sessionWord}, ${minutesLabel(stats.minutes)} in focus, and ${stats.routines} ${routineWord}. No guessing from me.`,
      action: { label: 'See my progress', kind: 'progress' },
    }
  }

  if (intent === 'start') {
    return {
      mood: 'cheer',
      text: 'Okay, two minutes. No pressure — I’ll be right here when it’s done. If it turns into more, great. If not, also great.',
      action: { label: 'Let’s start', kind: 'start' },
    }
  }

  if (intent === 'cheer') {
    return {
      mood: 'cheer',
      text: stats.sessions > 0 || stats.done > 0
        ? `${hey}, you’re already making a go of today. One tiny step is plenty — and so is taking a breath first.`
        : `${hey}, you’re here, and that’s enough for a beginning. Want me to sit with you while you pick one tiny step?`,
      action: { label: 'One tiny step', kind: 'start' },
    }
  }

  if (intent === 'sit') {
    return {
      mood: 'down',
      text: `${hey}, I’m right here. No fixing, no advice — just a quiet corner with you. Take your time.`,
    }
  }

  return {
    mood: 'cheer',
    text: `${hey}, I hear you. Tell me a bit more, or tap one of the little buttons — I’m here either way.`,
  }
}

export default function ChibiChat() {
  const { tasks, sessions, routineLogs, focus, user, preferences, toast } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const endRef = useRef(null)
  const dragRef = useRef(null)
  const draggedRef = useRef(false)

  const today = todayISO()
  const storageKey = `dayflow:buddy-memory:${user?.id || 'local'}`
  const accountName = (user?.name || '').trim().split(' ')[0] || ''
  const buddyName = preferences.buddyName || ''
  const buddyCharacter = preferences.buddyCharacter || 'auto'
  const buddyColor = preferences.buddyColor || 'default'
  const greetingName = buddyNameFor('cheer', buddyName, buddyCharacter)

  const stats = useMemo(() => {
    const finished = tasks.filter((task) => task.status === 'done' && dayKey(task.completed_at) === today)
    const recorded = sessions.filter((session) => (
      session.mode === 'task'
      && session.actual_minutes > 0
      && dayKey(session.ended_at || session.started_at) === today
    ))
    return {
      done: finished.length,
      sessions: recorded.length,
      minutes: recorded.reduce((sum, session) => sum + (session.actual_minutes || 0), 0),
      routines: routineLogs.filter((log) => log.day === today).length,
    }
  }, [tasks, sessions, routineLogs, today])

  const [memory, setMemory] = useState(() => loadMemory(storageKey))
  const [messages, setMessages] = useState(() => (
    memory.messages.length ? memory.messages : [greetingFor(accountName || memory.name, greetingName)]
  ))

  useEffect(() => {
    setMessages((current) => current.map((message, index) => (
      index === 0 && message.id === 'hello'
        ? { ...message, text: greetingFor(accountName || memory.name, greetingName).text }
        : message
    )))
    // Refresh the greeting when the account or buddy name changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountName, greetingName])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...memory, messages: messages.slice(-30) }))
    } catch { /* memory is optional */ }
  }, [storageKey, memory, messages])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, open])

  const startDrag = (event) => {
    if (event.target.closest('.buddy-head button, .buddy-foot button, input, textarea, a, select')) return
    dragRef.current = {
      startX: event.clientX, startY: event.clientY,
      offsetX: offset.x, offsetY: offset.y, moved: false,
    }
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* synthetic events do not capture */ }
  }

  const moveDrag = (event) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
    if (!drag.moved) return
    const maxLeft = Math.max(0, window.innerWidth - 150)
    const maxUp = Math.max(0, window.innerHeight - 150)
    setOffset({
      x: Math.min(40, Math.max(-maxLeft, drag.offsetX + dx)),
      y: Math.min(40, Math.max(-maxUp, drag.offsetY + dy)),
    })
  }

  const endDrag = () => {
    if (dragRef.current?.moved) {
      draggedRef.current = true
      setTimeout(() => { draggedRef.current = false }, 0)
    }
    dragRef.current = null
  }

  const openBuddy = () => {
    if (draggedRef.current) return
    setOpen(true)
  }

  const lastBuddy = [...messages].reverse().find((message) => message.from === 'buddy')
  const mood = lastBuddy?.mood || 'cheer'
  const baseFriend = FRIENDS[mood] || FRIENDS.cheer
  const friendName = buddyNameFor(mood, buddyName, buddyCharacter)
  const friend = {
    ...baseFriend,
    name: friendName,
    line: accountName ? `${baseFriend.line} · ${accountName}` : baseFriend.line,
  }

  const send = (text, forcedIntent) => {
    const value = String(text || '').trim()
    if (!value) return
    const intent = forcedIntent || detectIntent(value)
    const nameMatch = value.match(/\b(?:my name is|call me)\s+([a-z][a-z'-]{1,20})\b/i)
    const name = nameMatch
      ? nameMatch[1][0].toUpperCase() + nameMatch[1].slice(1)
      : (memory.name || accountName || '')
    const reply = replyFor(intent, stats, memory, name)
    const stamp = Date.now()
    setMemory((current) => ({
      ...current,
      name,
      notes: (current.notes || 0) + 1,
      topics: { ...(current.topics || {}), [intent]: (current.topics?.[intent] || 0) + 1 },
    }))
    setMessages((current) => [
      ...current,
      { id: `you-${stamp}`, from: 'you', text: value },
      { id: `buddy-${stamp}`, from: 'buddy', mood: reply.mood, text: reply.text, action: reply.action },
    ].slice(-30))
    setInput('')
  }

  const runAction = (action) => {
    if (!action) return
    if (action.kind === 'start') {
      focus.start({ minutes: 2, mode: 'task', taskTitle: 'Open focus session' })
      setMemory((current) => ({
        ...current,
        actions: { ...(current.actions || {}), start: (current.actions?.start || 0) + 1 },
      }))
      setOpen(false)
    }
    if (action.kind === 'progress') {
      setOpen(false)
      navigate('/progress')
    }
    if (action.kind === 'close') {
      toast('The day can wait until tomorrow.', 'gentle')
      setMemory((current) => ({
        ...current,
        actions: { ...(current.actions || {}), rest: (current.actions?.rest || 0) + 1 },
      }))
      setOpen(false)
    }
  }

  const forget = () => {
    try { localStorage.removeItem(storageKey) } catch { /* nothing to clear */ }
    setMemory({ ...EMPTY_MEMORY, topics: {}, actions: {}, messages: [] })
    setMessages([greetingFor(accountName, greetingName)])
    toast('Buddy forgot everything it learned.', 'gentle')
  }

  return (
    <div
      className="buddy-root"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {!open ? (
        <button
          className="buddy-fab"
          onClick={openBuddy}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Open your Memoza buddy. Drag to move."
        >
          <ChibiCompanion mood={mood} color={buddyColor} character={buddyCharacter} name={friendName} size={46} />
          <MessageCircle size={14} />
          <span>Buddy</span>
        </button>
      ) : (
        <section className="buddy-panel" role="dialog" aria-label={`Chat with ${friend.name}`}>
          <header
            className="buddy-head"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            title="Drag to move Buddy"
          >
            <ChibiCompanion mood={mood} color={buddyColor} character={buddyCharacter} name={friendName} size={52} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow">{friend.name} · {friend.line}</div>
              <strong className="small">{friend.title}</strong>
            </div>
            <button className="icon-btn plain" onClick={forget} aria-label="Forget what Buddy learned" title="Forget what Buddy learned"><Eraser size={16} /></button>
            <button className="icon-btn plain" onClick={() => setOpen(false)} aria-label="Close buddy"><X size={17} /></button>
          </header>

          <div className="buddy-messages" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`buddy-bubble ${message.from}`}>
                {message.text}
                {message.action && (
                  <div className="buddy-actions">
                    <button className="btn btn-sm btn-soft" onClick={() => runAction(message.action)}>{message.action.label}</button>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="buddy-quick">
            {QUICK_NOTES.map((note) => (
              <button
                key={note.id}
                className="chip button"
                onClick={() => send(note.text, note.id)}
              >{note.label}</button>
            ))}
          </div>

          <div className="buddy-foot">
            Learns locally in this browser only{' · '}
            <button className="text-btn" onClick={() => { setOpen(false); navigate('/settings') }}>Customize</button>{' · '}
            <button className="text-btn" onClick={forget}>Forget</button>
          </div>

          <form className="buddy-form" onSubmit={(event) => { event.preventDefault(); send(input) }}>
            <input
              className="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Tell me a little…"
              aria-label="Message your buddy"
            />
            <button className="btn btn-icon btn-primary" type="submit" disabled={!input.trim()} aria-label="Send message"><Send size={15} /></button>
          </form>
        </section>
      )}
    </div>
  )
}
