const MOOD_PALETTES = {
  down: { hoodie: '#8fb8e8', hoodieDark: '#6f9bd2', hair: '#7c6a9c', accent: '#b6d8f5' },
  evening: { hoodie: '#eda6c8', hoodieDark: '#d986ad', hair: '#6d5b8d', accent: '#ffe2a8' },
  cheer: { hoodie: '#a99ae0', hoodieDark: '#8976c9', hair: '#6b5b8c', accent: '#f6d38b' },
}

export const DEFAULT_BUDDY_NAMES = { down: 'Milo', evening: 'Lumi', cheer: 'Pip', focus: 'Nori' }

export const BUDDY_CHARACTERS = [
  { id: 'pip', name: 'Pip', tag: 'a tiny cheerleader', hoodie: '#a99ae0', hoodieDark: '#8976c9', hair: '#6b5b8c', accent: '#f6d38b' },
  { id: 'milo', name: 'Milo', tag: 'a gentle friend', hoodie: '#8fb8e8', hoodieDark: '#6f9bd2', hair: '#7c6a9c', accent: '#b6d8f5' },
  { id: 'lumi', name: 'Lumi', tag: 'a sleepy companion', hoodie: '#eda6c8', hoodieDark: '#d986ad', hair: '#6d5b8d', accent: '#ffe2a8' },
  { id: 'nori', name: 'Nori', tag: 'a calm study buddy', hoodie: '#8fc9b5', hoodieDark: '#66a891', hair: '#5f7d75', accent: '#e2f5c9' },
]

export const BUDDY_COLORS = [
  { id: 'default', label: 'Own colours', hoodie: 'var(--lavender)' },
  { id: 'lavender', label: 'Lavender', hoodie: '#a99ae0', hoodieDark: '#8976c9', hair: '#6b5b8c', accent: '#f6d38b' },
  { id: 'blue', label: 'Blue', hoodie: '#8fb8e8', hoodieDark: '#6f9bd2', hair: '#5f6f9c', accent: '#cfe9ff' },
  { id: 'pink', label: 'Pink', hoodie: '#eda6c8', hoodieDark: '#d986ad', hair: '#8a5f83', accent: '#ffe2a8' },
  { id: 'mint', label: 'Mint', hoodie: '#8fc9b5', hoodieDark: '#66a891', hair: '#5f7d75', accent: '#e2f5c9' },
]

export function buddyCharacterFor(mood, characterId) {
  if (characterId && characterId !== 'auto') return characterId
  if (mood === 'down') return 'milo'
  if (mood === 'evening') return 'lumi'
  return 'pip'
}

export function buddyNameFor(mood, customName, characterId) {
  const custom = (customName || '').trim()
  if (custom) return custom
  const resolved = buddyCharacterFor(mood, characterId)
  return BUDDY_CHARACTERS.find((item) => item.id === resolved)?.name
    || DEFAULT_BUDDY_NAMES[mood]
    || DEFAULT_BUDDY_NAMES.cheer
}

function paletteFor(mood, colorId, characterId) {
  const character = BUDDY_CHARACTERS.find((item) => item.id === characterId)
  const base = character
    ? { hoodie: character.hoodie, hoodieDark: character.hoodieDark, hair: character.hair, accent: character.accent }
    : (MOOD_PALETTES[mood] || MOOD_PALETTES.cheer)
  const override = BUDDY_COLORS.find((item) => item.id === colorId)
  return override?.hoodieDark ? { ...base, ...override } : base
}

const INK = '#4b4058'
const SKIN = '#f8d9c5'

export default function ChibiCompanion({
  mood = 'cheer', size = 96, color: colorId = 'default', character: characterId = 'auto', name = 'your buddy',
}) {
  const resolvedCharacter = buddyCharacterFor(mood, characterId)
  const color = paletteFor(mood, colorId, resolvedCharacter)
  const sleepy = mood === 'evening'
  const low = mood === 'down'
  const characterName = BUDDY_CHARACTERS.find((item) => item.id === resolvedCharacter)?.tag || 'companion'

  return (
    <svg
      className="chibi"
      width={size}
      height={size}
      viewBox="0 0 120 130"
      role="img"
      aria-label={`${name}, ${characterName}, in a ${mood === 'down' ? 'gentle' : mood === 'evening' ? 'sleepy' : 'cheerful'} moment`}
    >
      <ellipse cx="60" cy="122" rx="34" ry="5" fill="var(--line)" />

      {/* body and arms */}
      <path d="M34 85 Q60 72 86 85 L93 116 Q60 127 27 116 Z" fill={color.hoodie} stroke={INK} strokeWidth="2" />
      <path d="M46 86 Q60 99 74 86" fill="none" stroke={color.hoodieDark} strokeWidth="2" strokeLinecap="round" />
      {mood === 'cheer'
        ? <path d="M84 89 Q101 78 100 60" fill="none" stroke={color.hoodie} strokeWidth="10" strokeLinecap="round" />
        : <path d="M84 91 Q94 100 92 112" fill="none" stroke={color.hoodie} strokeWidth="9" strokeLinecap="round" />}
      <path d="M36 91 Q26 100 28 112" fill="none" stroke={color.hoodie} strokeWidth="9" strokeLinecap="round" />

      {/* head */}
      <circle cx="60" cy="49" r="36" fill={SKIN} stroke={INK} strokeWidth="2" />
      <circle cx="25" cy="52" r="6" fill={SKIN} stroke={INK} strokeWidth="2" />
      <circle cx="95" cy="52" r="6" fill={SKIN} stroke={INK} strokeWidth="2" />

      {/* character hair */}
      {resolvedCharacter === 'milo' ? (
        <>
          <path d="M24 49 Q24 14 60 13 Q96 14 96 49 Q84 27 49 35 Q33 39 24 49 Z" fill={color.hair} />
          <path d="M27 45 Q18 63 29 81" fill="none" stroke={color.hair} strokeWidth="9" strokeLinecap="round" />
          <path d="M92 45 Q101 62 90 78" fill="none" stroke={color.hair} strokeWidth="8" strokeLinecap="round" />
          <path d="M43 20 Q58 30 76 21" fill="none" stroke={color.accent} strokeWidth="3" strokeLinecap="round" />
        </>
      ) : resolvedCharacter === 'lumi' ? (
        <>
          <path d="M22 50 Q24 12 60 12 Q96 12 98 50 Q88 31 60 30 Q32 31 22 50 Z" fill={color.hair} />
          <path d="M23 46 Q17 64 29 83" fill="none" stroke={color.hair} strokeWidth="10" strokeLinecap="round" />
          <path d="M97 46 Q103 64 91 83" fill="none" stroke={color.hair} strokeWidth="10" strokeLinecap="round" />
          <path d="M34 27 Q60 16 86 27" fill="none" stroke={color.accent} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : resolvedCharacter === 'nori' ? (
        <>
          <path d="M26 47 Q28 16 60 16 Q92 16 94 47 Q80 31 60 32 Q40 31 26 47 Z" fill={color.hair} />
          <path d="M58 19 Q57 9 64 5" fill="none" stroke={color.hair} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M64 8 Q76 1 79 12 Q70 17 64 8 Z" fill={color.accent} stroke={INK} strokeWidth="1.3" />
        </>
      ) : (
        <>
          <path d="M24 48 Q26 14 60 14 Q94 14 96 48 Q82 32 60 33 Q38 32 24 48 Z" fill={color.hair} />
          <path d="M27 45 Q22 62 31 75" fill="none" stroke={color.hair} strokeWidth="9" strokeLinecap="round" />
          <path d="M93 45 Q98 62 89 75" fill="none" stroke={color.hair} strokeWidth="9" strokeLinecap="round" />
          <path d="M48 20 Q60 27 72 20" fill="none" stroke={color.accent} strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {/* face */}
      {sleepy ? (
        <>
          <path d="M42 53 Q48 58 54 53" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M66 53 Q72 58 78 53" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M55 66 Q60 70 65 66" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : low ? (
        <>
          <path d="M43 55 Q48 51 53 55" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M67 55 Q72 51 77 55" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M55 69 Q60 65 65 69" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="48" cy="54" r="4" fill={INK} />
          <circle cx="72" cy="54" r="4" fill={INK} />
          <circle cx="49.5" cy="52.5" r="1.3" fill="#fff" />
          <circle cx="73.5" cy="52.5" r="1.3" fill="#fff" />
          <path d="M53 66 Q60 74 67 66" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      <circle cx="38" cy="62" r="5" fill="#f3a8ad" opacity="0.65" />
      <circle cx="82" cy="62" r="5" fill="#f3a8ad" opacity="0.65" />

      {/* character details */}
      {resolvedCharacter === 'nori' && (
        <g fill="none" stroke={INK} strokeWidth="1.8" opacity="0.82">
          <circle cx="48" cy="54" r="10" />
          <circle cx="72" cy="54" r="10" />
          <path d="M58 54 Q60 52 62 54" />
        </g>
      )}
      {resolvedCharacter === 'pip' && (
        <path d="M90 32 L92 37 L97 39 L92 41 L90 46 L88 41 L83 39 L88 37 Z" fill={color.accent} stroke={INK} strokeWidth="1.2" />
      )}
      {resolvedCharacter === 'milo' && (
        <g>
          <path d="M50 84 Q60 91 70 84" fill="none" stroke={color.accent} strokeWidth="5" strokeLinecap="round" />
          <circle cx="60" cy="88" r="3.5" fill={color.accent} stroke={INK} strokeWidth="1.2" />
        </g>
      )}
      {resolvedCharacter === 'lumi' && (
        <path d="M91 24 A6 6 0 1 0 91 34 A5 5 0 1 1 91 24 Z" fill={color.accent} stroke={INK} strokeWidth="1.2" />
      )}

      {/* small mood details */}
      {low && (
        <g>
          <path d="M13 27 Q19 20 26 27 Q33 20 39 27 Q35 34 26 34 Q17 34 13 27 Z" fill="#dbe7f6" stroke={INK} strokeWidth="1.5" />
          <path d="M21 37 L19 42" stroke="#8fb8e8" strokeWidth="2" strokeLinecap="round" />
          <path d="M31 37 L29 42" stroke="#8fb8e8" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {sleepy && (
        <g>
          <path d="M101 18 A10 10 0 1 0 101 36 A8 8 0 1 1 101 18 Z" fill="#ffe2a8" stroke={INK} strokeWidth="1.5" />
          <path d="M88 43 L90 47 L94 48 L90 49 L88 53 L86 49 L82 48 L86 47 Z" fill="#ffe2a8" />
        </g>
      )}
      {mood === 'cheer' && (
        <g fill={color.accent}>
          <path d="M12 24 L14 29 L19 31 L14 33 L12 38 L10 33 L5 31 L10 29 Z" />
          <path d="M104 26 L106 30 L110 32 L106 34 L104 38 L102 34 L98 32 L102 30 Z" />
        </g>
      )}
    </svg>
  )
}
