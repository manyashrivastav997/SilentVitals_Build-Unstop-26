import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { VideoFeed } from './VideoFeed'
import { useAudioStress } from '../hooks/useAudioStress'
import { useFaceStress } from '../hooks/useFaceStress'
import { useSessionManager } from '../hooks/useSessionManager'
import { scoreToLevel } from '../hooks/useStressAggregator'
import { saveBlinkRateRecord, saveFatigueRecord, saveHeartRateRecord, savePatientStressRecord } from '../db/indexedDb'
import { useHeartRateDetection } from '../hooks/useHeartRateDetection'
import { useBlinkDetection } from '../hooks/useBlinkDetection'
import { useFatigueCalculation } from '../hooks/useFatigueCalculation'

export default function HospitalPatientStressCheck({
  patientId,
  onComplete,
  onCancel,
}: {
  patientId: string
  onComplete: () => void
  onCancel: () => void
}) {
  const sessionActiveRef = useRef(false)
  const face = useFaceStress(sessionActiveRef)
  const audio = useAudioStress()

  const [saving, setSaving] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)
  const [watchdogError, setWatchdogError] = useState<string | null>(null)
  const startedAtRef = useRef<number | null>(null)

  const appendNoop = useCallback(() => {}, [])
  const historyApi = useMemo(() => ({ append: appendNoop }), [appendNoop])
  const onSessionCompleteNoop = useCallback(() => {}, [])

  const session = useSessionManager(face, audio, historyApi, onSessionCompleteNoop, sessionActiveRef)

  const hr = useHeartRateDetection(face.videoRef, session.phase === 'running')
  const blink = useBlinkDetection({ videoRef: face.videoRef, isActive: session.phase === 'running' })
  const fatigue = useFatigueCalculation({
    blinkRate: blink.blinkRate,
    stressLevel: session.liveScore,
    timeOfDay: new Date().getHours(),
    sessionDuration: session.phase === 'running' ? (15 - session.secondsLeft) / 60 : undefined,
    eyeClosureDuration: blink.eyeClosureDuration,
  })

  const start = useCallback(async () => {
    setSavedError(null)
    setWatchdogError(null)
    startedAtRef.current = Date.now()
    await session.startSession()
  }, [session])

  const stop = useCallback(() => {
    session.stopSession()
    startedAtRef.current = null
  }, [session])

  // Watchdog: if the session doesn't complete within 20s, auto-stop and show a retry message.
  useEffect(() => {
    if (session.phase !== 'running') return
    const id = window.setInterval(() => {
      const startedAt = startedAtRef.current
      if (!startedAt) return
      const elapsedMs = Date.now() - startedAt
      if (elapsedMs > 20_000 && session.phase === 'running') {
        stop()
        setWatchdogError(
          'The check-in is taking longer than expected. Please try again (ensure camera/microphone permissions are allowed).',
        )
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [session.phase, stop])

  useEffect(() => {
    if (session.phase !== 'complete' || !session.sessionResult) return
    if (saving) return
    void (async () => {
      setSaving(true)
      setSavedError(null)
      try {
        const s = session.sessionResult!.score
        const level = scoreToLevel(s)
        const concurrentHeartRate = hr.heartRate ?? undefined
        await savePatientStressRecord({
          userId: patientId,
          timestamp: new Date(),
          score: s,
          level: level === 'low' ? 'Low' : level === 'medium' ? 'Medium' : 'High',
          faceConfidence: Math.min(1, session.faceSampleCount / 5),
          audioConfidence: 0.8,
          sessionDuration: 15,
          status: 'complete',
          concurrentHeartRate,
        })
        if (hr.heartRate) {
          await saveHeartRateRecord({
            patientId,
            timestamp: new Date(),
            bpm: hr.heartRate,
            source: 'camera',
            confidence: hr.confidence,
            context: level === 'low' ? 'resting' : level === 'medium' ? 'active' : 'stressed',
          })
        }
        if (blink.blinkRate != null) {
          await saveBlinkRateRecord({
            patientId,
            timestamp: new Date(),
            blinksPerMinute: blink.blinkRate,
            eyeClosureDuration: blink.eyeClosureDuration || undefined,
            confidence: blink.confidence,
            context: level === 'low' ? 'resting' : level === 'medium' ? 'conversation' : 'screen',
          })
        }
        if (fatigue) {
          await saveFatigueRecord({
            patientId,
            timestamp: new Date(),
            score: fatigue.score,
            level: fatigue.level,
            contributingFactors: fatigue.contributingFactors,
            recommendation: fatigue.recommendation,
          })
        }
        onComplete()
      } catch (e) {
        setSavedError(e instanceof Error ? e.message : 'Failed to save record')
      } finally {
        setSaving(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase, session.sessionResult])

  const faceDetected = session.faceSampleCount > 0

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-dvh max-w-6xl flex-col px-4 py-4 text-slate-50 sm:px-6">
        <header className="flex items-center justify-between rounded-2xl border border-emerald-800/40 bg-emerald-950/60 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              🧘 Stress Check-in
            </p>
            <p className="text-[12px] text-emerald-100/80">
              Look at the camera naturally. We&apos;ll analyze for 15 seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stop()
              onCancel()
            }}
            className="min-h-[44px] rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            <span className="inline-flex items-center gap-2">
              <X className="h-4 w-4" />
              Close
            </span>
          </button>
        </header>

        <main className="mt-4 grid flex-1 gap-4 lg:grid-cols-[1.2fr,1fr]">
          <VideoFeed
            videoRef={face.videoRef}
            canvasRef={face.canvasRef}
            sessionRunning={session.phase === 'running'}
            modelsLoading={face.modelsLoading}
            loadProgress={face.loadProgress}
            loadError={face.loadError}
            mediaError={session.mediaError}
          />

          <div className="space-y-4">
            <section className="rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-4">
              <p className="text-xs font-semibold text-slate-200">Current Stress</p>
              <p className="mt-2 text-3xl font-semibold text-white tabular-nums">
                {Math.round(session.liveScore)}%
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Level:{' '}
                <span className="font-semibold">
                  {session.liveLevel === 'low'
                    ? 'Low 🟢'
                    : session.liveLevel === 'medium'
                    ? 'Medium 🟡'
                    : 'High 🔴'}
                </span>
              </p>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Time remaining:{' '}
                  <span className="font-mono text-slate-200">{session.secondsLeft}s</span>
                </span>
                <span>
                  Face detected:{' '}
                  <span className={faceDetected ? 'text-emerald-300' : 'text-amber-300'}>
                    {faceDetected ? '✅' : '⚠️'}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Heart rate:{' '}
                  <span className="font-mono text-slate-200">
                    {hr.isMeasuring ? (hr.heartRate ? `${hr.heartRate} BPM` : 'measuring…') : '—'}
                  </span>
                </span>
                <span>
                  Confidence:{' '}
                  <span className="font-mono text-slate-200">
                    {hr.isMeasuring ? `${hr.confidence}%` : '—'}
                  </span>
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {session.phase !== 'running' ? (
                  <button
                    type="button"
                    onClick={() => void start()}
                    disabled={face.modelsLoading || Boolean(face.loadError) || saving}
                    className="min-h-[48px] flex-1 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Start Check
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className="min-h-[48px] flex-1 rounded-full bg-slate-700 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-600"
                  >
                    ⟳ Stop Early
                  </button>
                )}
              </div>

              {session.mediaError && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
                  ⚠️ {session.mediaError}
                </div>
              )}
              {savedError && (
                <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
                  {savedError}
                </div>
              )}
              {watchdogError && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
                  ⚠️ {watchdogError}
                </div>
              )}
              {saving && (
                <p className="mt-3 text-xs text-slate-400">Saving result…</p>
              )}
            </section>

            <section className="rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-4">
              <p className="text-xs font-semibold text-slate-200">📋 Instructions</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                <li>• Look at the camera naturally</li>
                <li>• We&apos;ll analyze for 15 seconds</li>
                <li>• Breathe normally</li>
              </ul>
              <p className="mt-3 text-[11px] text-slate-400">
                Your data stays on this device. Only your care team can view results.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

