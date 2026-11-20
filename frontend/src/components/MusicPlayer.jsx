import { useCallback, useEffect, useRef, useState } from 'react'
import { Music2, Pause, Play, Radio, Youtube } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { musicChoice } from '../lib/music'
import MusicPicker from './MusicPicker'

const PLAYER_ID = 'dayflow-focus-music'
let youtubePromise = null

function loadYouTubePlayer() {
  if (youtubePromise) return youtubePromise
  youtubePromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT)
      return
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      youtubePromise = null
      reject(new Error('YouTube player could not load.'))
    }
    document.head.appendChild(script)
  })
  return youtubePromise
}

export default function MusicPlayer() {
  const { timer, preferences } = useApp()
  const enabled = !!preferences.musicEnabled
  const choice = musicChoice(preferences)
  const source = choice.source
  const running = !!timer?.running

  const audioRef = useRef(null)
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const shouldPlayRef = useRef(enabled && running)

  const [playerReady, setPlayerReady] = useState(false)
  const [playerState, setPlayerState] = useState(-1)
  const [audioReady, setAudioReady] = useState(false)
  const [audioState, setAudioState] = useState('idle')
  const [errorCode, setErrorCode] = useState(null)

  const isPlaying = source === 'youtube' ? playerState === 1 : audioState === 'playing'
  const ready = source === 'youtube' ? playerReady : audioReady
  const blocked = enabled && running && ready && !isPlaying && !errorCode

  const command = useCallback((func) => {
    const player = playerRef.current
    if (!readyRef.current || typeof player?.[func] !== 'function') return
    player[func]()
  }, [])

  const playAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.play()
      .then(() => setAudioState('playing'))
      .catch(() => setAudioState('blocked'))
  }, [])

  useEffect(() => {
    shouldPlayRef.current = enabled && running
  }, [enabled, running])

  useEffect(() => {
    setErrorCode(null)
    if (source === 'youtube') {
      setPlayerReady(false)
      setPlayerState(-1)
    } else {
      setAudioReady(false)
      setAudioState('idle')
    }
  }, [source, choice.id])

  // YouTube IFrame player: used only when the YouTube source is selected.
  useEffect(() => {
    if (!enabled || source !== 'youtube' || !hostRef.current) return undefined
    let cancelled = false
    readyRef.current = false

    loadYouTubePlayer()
      .then((YT) => {
        if (cancelled || !hostRef.current) return
        hostRef.current.replaceChildren()
        playerRef.current = new YT.Player(PLAYER_ID, {
          videoId: choice.id,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              readyRef.current = true
              setPlayerReady(true)
              command(shouldPlayRef.current ? 'playVideo' : 'pauseVideo')
            },
            onStateChange: (event) => {
              if (!cancelled) setPlayerState(event.data)
            },
            onError: (event) => {
              if (!cancelled) setErrorCode(event.data)
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) setErrorCode('load')
      })

    return () => {
      cancelled = true
      readyRef.current = false
      setPlayerReady(false)
      try { playerRef.current?.destroy() } catch { /* already gone */ }
      playerRef.current = null
    }
  }, [enabled, source, choice.id, command])

  useEffect(() => {
    if (source !== 'youtube') return
    command(running ? 'playVideo' : 'pauseVideo')
  }, [source, running, choice.id, command])

  // Direct audio: reliable play/pause with no embed restrictions.
  useEffect(() => {
    if (!enabled || source !== 'audio') return
    const audio = audioRef.current
    if (!audio) return
    if (running) playAudio()
    else {
      audio.pause()
      setAudioState('paused')
    }
  }, [enabled, source, running, choice.id, playAudio])

  // Browsers sometimes hold autoplay until the first interaction on the page.
  useEffect(() => {
    if (!enabled || !running || isPlaying) return undefined
    const retry = () => {
      shouldPlayRef.current = true
      if (source === 'youtube') command('playVideo')
      else playAudio()
    }
    document.addEventListener('pointerdown', retry, { once: true })
    return () => document.removeEventListener('pointerdown', retry)
  }, [enabled, running, source, choice.id, isPlaying, command, playAudio])

  const errorLabel = source === 'youtube'
    ? errorCode === 'load'
      ? 'YouTube could not load here. Check your connection, then reopen Focus.'
      : errorCode === 101 || errorCode === 150
        ? 'This video does not allow embedded playback. Choose another YouTube pick.'
        : errorCode
          ? `YouTube reported a playback error (${errorCode}). Try another pick.`
          : ''
    : errorCode
      ? 'This audio track could not load. Try another pick.'
      : ''

  const SourceIcon = source === 'youtube' ? Youtube : Radio

  return (
    <section className="panel flat music-panel">
      <div className="row">
        <Music2 size={17} color="var(--sky-deep)" />
        <strong className="small">Background music</strong>
        <span className="spacer" />
        <span className="chip sky">optional</span>
      </div>

      {enabled ? (
        <>
          {source === 'youtube' && (
            <div className="music-frame-wrap">
              <div id={PLAYER_ID} ref={hostRef} />
            </div>
          )}
          {source === 'audio' && (
            <audio
              ref={audioRef}
              src={choice.src}
              loop
              preload="auto"
              onCanPlay={() => { setAudioReady(true); setErrorCode(null) }}
              onPlay={() => setAudioState('playing')}
              onPause={() => setAudioState('paused')}
              onError={() => { setAudioReady(false); setErrorCode('audio') }}
            />
          )}

          <div className="row-wrap" style={{ marginTop: source === 'youtube' ? 8 : 2 }}>
            <span className="chip lavender"><SourceIcon size={13} /> {source === 'youtube' ? 'YouTube' : 'Direct audio'}</span>
            <span className="small">{choice.label}</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>
            Music follows your session: pause the timer and it pauses here.
          </div>
          <div className="row-wrap" style={{ marginTop: 9 }}>
            <button
              className="btn btn-sm btn-soft"
              onClick={() => (source === 'youtube' ? command('playVideo') : playAudio())}
              disabled={!running || !ready}
            >
              <Play size={14} /> {isPlaying ? 'Restart music' : 'Start music'}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => (source === 'youtube' ? command('pauseVideo') : audioRef.current?.pause())}
              disabled={!ready}
            >
              <Pause size={14} /> Pause music
            </button>
          </div>
          {isPlaying && <div className="tiny" style={{ marginTop: 6, color: 'var(--sage-deep)' }}>Music is playing.</div>}
          {blocked && <div className="tiny muted" style={{ marginTop: 6 }}>Your browser held playback back. Use Start music, or press play inside the video.</div>}
          {!running && <div className="tiny muted" style={{ marginTop: 6 }}>Your session is paused. Music is paused too.</div>}
          {!ready && !errorLabel && <div className="tiny muted" style={{ marginTop: 6 }}>Loading music…</div>}
          {errorLabel && <div className="tiny muted" style={{ marginTop: 6 }}>{errorLabel}</div>}
          <div className="tiny muted" style={{ marginTop: 6 }}>
            {choice.credit}
            {choice.creditUrl && <> · <a href={choice.creditUrl} target="_blank" rel="noreferrer">source</a></>}
            {choice.licenseUrl && <> · <a href={choice.licenseUrl} target="_blank" rel="noreferrer">{choice.license}</a></>}
          </div>

          <details className="more-fields">
            <summary>Change music</summary>
            <MusicPicker compact />
          </details>
        </>
      ) : (
        <p className="small muted" style={{ margin: '8px 0 0' }}>
          Music is off. You can turn it on before your next session in Settings or on the Focus page.
        </p>
      )}
    </section>
  )
}
