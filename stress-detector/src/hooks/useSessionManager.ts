import type { MutableRefObject } from 'react'
import { useCallback, useRef, useState } from 'react'
import {
  CHART_TICK_MS,
  FACE_SAMPLE_COUNT,
  FACE_SAMPLE_INTERVAL_MS,
  ROLLING_CHART_MS,
  SESSION_SECONDS,
} from '../constants'
import type { StressLevel } from './useStressAggregator'
import {
  combineStress,
  combineStressLive,
  scoreToLevel,
} from './useStressAggregator'
import type { useAudioStress } from './useAudioStress'
import type { useFaceStress } from './useFaceStress'
import type { useStressHistory } from './useStressHistory'

export type SessionPhase = 'idle' | 'running' | 'complete'

export type SessionResult = {
  score: number
  level: StressLevel
  lowConfidence: boolean
}

type HistoryApi = Pick<ReturnType<typeof useStressHistory>, 'append'>

export function useSessionManager(
  face: ReturnType<typeof useFaceStress>,
  audio: ReturnType<typeof useAudioStress>,
  history: HistoryApi,
  onSessionComplete: () => void,
  sessionActiveRef: MutableRefObject<boolean>,
) {
  const [phase, setPhase] = useState<SessionPhase>('idle')
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS)
  const [liveScore, setLiveScore] = useState(0)
  const [liveLevel, setLiveLevel] = useState<StressLevel>('low')
  const [chartPoints, setChartPoints] = useState<{ t: number; score: number }[]>([])
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [faceSampleCount, setFaceSampleCount] = useState(0)
  const [chartWindowEnd, setChartWindowEnd] = useState(() => Date.now())

  const faceSamplesRef = useRef<number[]>([])
  const timersRef = useRef<number[]>([])
  const finishingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => {
      clearTimeout(id)
      clearInterval(id)
    })
    timersRef.current = []
  }, [])

  const stopStreams = useCallback(() => {
    sessionActiveRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const v = face.videoRef.current
    if (v) v.srcObject = null
    audio.disconnect()
    face.clearLandmarks()
  }, [audio, face, sessionActiveRef])

  const finishSession = useCallback(() => {
    if (finishingRef.current) return
    finishingRef.current = true
    clearTimers()

    const samples = [...faceSamplesRef.current]
    const validCount = samples.length
    const facialAvg =
      validCount > 0 ? samples.reduce((a, b) => a + b, 0) / validCount : null
    const audioScore = audio.getRollingStress()
    const finalScore = combineStress(facialAvg, audioScore)
    const level = scoreToLevel(finalScore)
    const lowConfidence = validCount < 3

    history.append(finalScore, level)
    onSessionComplete()
    setSessionResult({ score: finalScore, level, lowConfidence })
    setPhase('complete')
    setLiveScore(finalScore)
    setLiveLevel(level)
    stopStreams()
    finishingRef.current = false
  }, [audio, clearTimers, history, onSessionComplete, stopStreams])

  const startSession = useCallback(async () => {
    if (!face.modelsReady) return
    finishingRef.current = false
    setSessionResult(null)
    faceSamplesRef.current = []
    face.clearLandmarks()
    audio.reset()

    setMediaError(null)
    sessionActiveRef.current = true
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      })
    } catch (e: unknown) {
      sessionActiveRef.current = false
      setMediaError(
        e instanceof Error ? e.message : 'Camera or microphone permission denied.',
      )
      return
    }

    streamRef.current = stream
    await audio.connect(stream)
    const v = face.videoRef.current
    if (v) {
      v.srcObject = stream
      await v.play()
    }

    setPhase('running')
    setSecondsLeft(SESSION_SECONDS)
    setChartPoints([])
    setFaceSampleCount(0)

    for (let i = 0; i < FACE_SAMPLE_COUNT; i++) {
      const delay = i * FACE_SAMPLE_INTERVAL_MS
      const tid = window.setTimeout(async () => {
        const video = face.videoRef.current
        if (!video) return
        const s = await face.sampleFace(video)
        if (s !== null) faceSamplesRef.current.push(s)
      }, delay)
      timersRef.current.push(tid)
    }

    let elapsed = 0
    const countdownId = window.setInterval(() => {
      elapsed++
      setSecondsLeft(SESSION_SECONDS - elapsed)
      if (elapsed >= SESSION_SECONDS) {
        clearInterval(countdownId)
        finishSession()
      }
    }, 1000)
    timersRef.current.push(countdownId)

    const runLiveTick = () => {
      const audioScore = audio.getRollingStress()
      const valid = [...faceSamplesRef.current]
      setFaceSampleCount(valid.length)
      const score = combineStressLive(valid, audioScore)
      setLiveScore(score)
      setLiveLevel(scoreToLevel(score))
      const now = Date.now()
      setChartWindowEnd(now)
      setChartPoints((prev) => {
        const next = [...prev, { t: now, score }]
        const cutoff = now - ROLLING_CHART_MS
        return next.filter((p) => p.t >= cutoff)
      })
    }
    runLiveTick()
    const liveId = window.setInterval(runLiveTick, CHART_TICK_MS)
    timersRef.current.push(liveId)
  }, [audio, face, finishSession, sessionActiveRef])

  const stopSession = useCallback(() => {
    clearTimers()
    finishingRef.current = false
    stopStreams()
    setPhase('idle')
    setSecondsLeft(SESSION_SECONDS)
    setSessionResult(null)
  }, [clearTimers, stopStreams])

  const resetToIdle = useCallback(() => {
    setPhase('idle')
    setSessionResult(null)
  }, [])

  return {
    phase,
    secondsLeft,
    liveScore,
    liveLevel,
    chartPoints,
    chartWindowEnd,
    sessionResult,
    mediaError,
    faceSampleCount,
    startSession,
    stopSession,
    resetToIdle,
  }
}
