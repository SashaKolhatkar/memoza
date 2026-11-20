import { useState } from 'react'
import { Music2, Radio, Volume2, VolumeX, Youtube } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Switch } from './ui'
import { AUDIO_PRESETS, YOUTUBE_PRESETS, musicChoice, youtubeId } from '../lib/music'
import { cx } from '../lib/utils'

export default function MusicPicker({ compact = false }) {
  const { preferences, setPreference, toast } = useApp()
  const enabled = !!preferences.musicEnabled
  const source = preferences.musicSource === 'youtube' ? 'youtube' : 'audio'
  const choice = musicChoice(preferences)
  const [customUrl, setCustomUrl] = useState('')

  const addCustom = async () => {
    const id = youtubeId(customUrl)
    if (!id) {
      toast('Paste a YouTube link or an 11-character video ID.', 'warn')
      return
    }
    await setPreference('musicSource', 'youtube')
    await setPreference('musicVideoId', id)
    setCustomUrl('')
    toast('Your YouTube pick was saved.', 'gentle')
  }

  return (
    <div className={cx('music-picker', compact && 'compact')}>
      <Switch
        checked={enabled}
        onChange={(value) => setPreference('musicEnabled', value)}
        label={enabled ? 'Optional music is on' : 'Optional music is off'}
      />
      <div className="tiny muted">
        {enabled ? 'Plays only while a focus session is running.' : 'Pick a quiet track for when you want one.'}
      </div>

      <div className="music-options" aria-label="Choose music source">
        <button
          type="button"
          className={cx('music-option', source === 'audio' && 'selected')}
          onClick={() => setPreference('musicSource', 'audio')}
          aria-pressed={source === 'audio'}
        >
          <span className="music-option-icon"><Radio size={15} /></span>
          <span><strong>Direct audio</strong><small>reliable, no embed limits</small></span>
        </button>
        <button
          type="button"
          className={cx('music-option', source === 'youtube' && 'selected')}
          onClick={() => setPreference('musicSource', 'youtube')}
          aria-pressed={source === 'youtube'}
        >
          <span className="music-option-icon"><Youtube size={15} /></span>
          <span><strong>YouTube</strong><small>presets or your own link</small></span>
        </button>
      </div>

      {source === 'audio' ? (
        <div className="music-options" aria-label="Choose direct audio">
          {AUDIO_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx('music-option', choice.id === item.id && 'selected')}
              onClick={() => setPreference('musicAudioId', item.id)}
              aria-pressed={choice.id === item.id}
            >
              <span className="music-option-icon">{choice.id === item.id ? <Volume2 size={15} /> : <Music2 size={15} />}</span>
              <span><strong>{item.label}</strong><small>{item.note}</small></span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="music-options" aria-label="Choose YouTube music">
            {YOUTUBE_PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx('music-option', choice.id === item.id && 'selected')}
                onClick={() => setPreference('musicVideoId', item.id)}
                aria-pressed={choice.id === item.id}
              >
                <span className="music-option-icon">{choice.id === item.id ? <Volume2 size={15} /> : <Youtube size={15} />}</span>
                <span><strong>{item.label}</strong><small>{item.note}</small></span>
              </button>
            ))}
          </div>
          <div className="music-custom">
            <input
              className="input"
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="Or paste a YouTube link"
              aria-label="Paste a YouTube link"
            />
            <button className="btn btn-sm btn-ghost" type="button" onClick={addCustom} disabled={!customUrl.trim()}>Use link</button>
          </div>
          {!YOUTUBE_PRESETS.some((item) => item.id === choice.id) && (
            <div className="tiny muted">Your saved video ID: {choice.id}</div>
          )}
        </>
      )}

      <div className="tiny muted">
        <VolumeX size={12} /> {choice.credit}
        {choice.creditUrl && <> · <a href={choice.creditUrl} target="_blank" rel="noreferrer">source</a></>}
        {choice.licenseUrl && <> · <a href={choice.licenseUrl} target="_blank" rel="noreferrer">{choice.license}</a></>}
      </div>
    </div>
  )
}
