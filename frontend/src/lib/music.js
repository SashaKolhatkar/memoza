// Calm, freely licensed direct audio. Playback is controlled by a plain
// HTMLAudioElement, so it follows the focus timer without YouTube embed limits.
export const AUDIO_PRESETS = [
  {
    id: 'senbazuru',
    label: 'Quiet strings',
    note: 'soft and steady',
    src: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Senbazuru_%28ISRC_USUAN1100821%29.mp3',
    credit: 'Senbazuru by Kevin MacLeod',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Senbazuru_(ISRC_USUAN1100821).mp3',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  {
    id: 'simple-piano',
    label: 'Simple piano',
    note: 'gentle notes',
    src: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Simple_Piano_%28Antti_Luode%29.mp3',
    credit: 'Simple Piano by Antti Luode',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Simple_Piano_(Antti_Luode).mp3',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  {
    id: 'lofi',
    label: 'Soft lofi',
    note: 'a light backbeat',
    src: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Lofi_by_Caden_Currie.mp3',
    credit: 'Lofi by Caden Currie',
    creditUrl: 'https://commons.wikimedia.org/wiki/File:Lofi_by_Caden_Currie.mp3',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
]

// YouTube embeds that were verified to allow playback inside DAYFLOW.
export const YOUTUBE_PRESETS = [
  { id: 'KNdjMEcG0mw', label: 'Soft ambient', note: '10-minute relaxing timer' },
  { id: 'ru4hdcMmlwQ', label: 'Pure waves', note: '10-minute meditation music' },
  { id: '8WVXk0Gz66E', label: 'Calm piano', note: 'long piano and guitar' },
]

export const DEFAULT_MUSIC = {
  enabled: false,
  source: 'audio',
  audioId: AUDIO_PRESETS[0].id,
  videoId: YOUTUBE_PRESETS[0].id,
}

export function youtubeId(value) {
  const text = String(value || '').trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text
  const match = text.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match?.[1] || ''
}

export function musicChoice(preferences = {}) {
  const source = preferences.musicSource === 'youtube' ? 'youtube' : 'audio'
  if (source === 'youtube') {
    const videoId = youtubeId(preferences.musicVideoId) || DEFAULT_MUSIC.videoId
    const preset = YOUTUBE_PRESETS.find((item) => item.id === videoId)
    return {
      source,
      id: videoId,
      label: preset?.label || 'Your YouTube pick',
      credit: 'Played through YouTube. Videos and ads are controlled by YouTube.',
    }
  }
  const audio = AUDIO_PRESETS.find((item) => item.id === preferences.musicAudioId) || AUDIO_PRESETS[0]
  return {
    source,
    id: audio.id,
    label: audio.label,
    note: audio.note,
    src: audio.src,
    credit: audio.credit,
    creditUrl: audio.creditUrl,
    license: audio.license,
    licenseUrl: audio.licenseUrl,
  }
}
