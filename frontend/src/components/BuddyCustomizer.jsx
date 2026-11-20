import { useEffect, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import ChibiCompanion, { BUDDY_CHARACTERS, BUDDY_COLORS, buddyNameFor } from './ChibiCompanion'
import { cx } from '../lib/utils'

export default function BuddyCustomizer() {
  const { preferences, setPreference, toast } = useApp()
  const [name, setName] = useState(preferences.buddyName || '')
  const color = preferences.buddyColor || 'default'
  const character = preferences.buddyCharacter || 'auto'

  useEffect(() => {
    setName(preferences.buddyName || '')
  }, [preferences.buddyName])

  const saveName = async () => {
    const value = name.trim()
    await setPreference('buddyName', value)
    toast(value ? `${value} is now your buddy’s name.` : 'Your buddy will use its default name again.', 'gentle')
  }

  const resetName = async () => {
    setName('')
    await setPreference('buddyName', '')
    toast('Your buddy will use its default name again.', 'gentle')
  }

  const chooseCharacter = async (id, label) => {
    await setPreference('buddyCharacter', id)
    toast(id === 'auto' ? 'Your buddy will follow the moment again.' : `${label} is your buddy now.`, 'gentle')
  }

  return (
    <div className="buddy-custom">
      <div className="row buddy-preview">
        <ChibiCompanion
          mood="cheer"
          color={color}
          character={character}
          name={buddyNameFor('cheer', name, character)}
          size={62}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">Your buddy</div>
          <div className="small muted">Pick a friend, or leave it on Mood. Blank name keeps the default.</div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <input
          className="input"
          style={{ maxWidth: 230 }}
          value={name}
          maxLength={24}
          onChange={(event) => setName(event.target.value)}
          placeholder="Buddy name (optional)"
          aria-label="Buddy name"
        />
        <button className="btn btn-sm btn-soft" onClick={saveName}><Check size={14} /> Save name</button>
      </div>

      <div className="buddy-option-block">
        <div className="chart-caption">Character</div>
        <div className="row-wrap">
          <button
            className={cx('chip button', character === 'auto' && 'lavender selected')}
            onClick={() => chooseCharacter('auto', 'Mood')}
          >Mood</button>
          {BUDDY_CHARACTERS.map((option) => (
            <button
              key={option.id}
              className={cx('chip button buddy-character-chip', character === option.id && 'lavender selected')}
              onClick={() => chooseCharacter(option.id, option.name)}
              title={option.tag}
            >
              <ChibiCompanion mood="cheer" color={color} character={option.id} name={option.name} size={26} />
              {option.name}
            </button>
          ))}
        </div>
      </div>

      <div className="buddy-option-block">
        <div className="chart-caption">Colour</div>
        <div className="row-wrap">
          {BUDDY_COLORS.map((option) => (
            <button
              key={option.id}
              className={cx('chip button', color === option.id && 'lavender selected')}
              onClick={() => setPreference('buddyColor', option.id)}
              title={option.id === 'default' ? 'Use the character’s own colours' : `${option.label} colours`}
            >
              <span className="buddy-swatch" style={{ background: option.hoodie }} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row-wrap" style={{ marginTop: 8 }}>
        {preferences.buddyName && (
          <button className="btn btn-sm btn-ghost" onClick={resetName}><RotateCcw size={13} /> Default name</button>
        )}
        {character !== 'auto' && (
          <button className="btn btn-sm btn-ghost" onClick={() => chooseCharacter('auto', 'Mood')}><RotateCcw size={13} /> Follow my mood</button>
        )}
        {color !== 'default' && (
          <button className="btn btn-sm btn-ghost" onClick={() => setPreference('buddyColor', 'default')}><RotateCcw size={13} /> Own colours</button>
        )}
      </div>
    </div>
  )
}
