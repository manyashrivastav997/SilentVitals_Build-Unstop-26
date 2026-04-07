import { useEffect, useRef, useState } from 'react'
import { CheckInNotification } from './components/CheckInNotification'
import { HistoryLog } from './components/HistoryLog'
import { SettingsPanel } from './components/SettingsPanel'
import { StressDisplay } from './components/StressDisplay'
import { StressGuidePanel } from './components/StressGuidePanel'
import { TrendChart } from './components/TrendChart'
import { VideoFeed } from './components/VideoFeed'
import { useAudioStress } from './hooks/useAudioStress'
import { useFaceStress } from './hooks/useFaceStress'
import { useIntervalScheduler } from './hooks/useIntervalScheduler'
import { scoreToLevel } from './hooks/useStressAggregator'
import type { StressLevel } from './hooks/useStressAggregator'
import { useSessionManager } from './hooks/useSessionManager'
import { useStressHistory, type StressRecord } from './hooks/useStressHistory'

function recordToGuideLevel(r: StressRecord | undefined): StressLevel | null {
  if (!r) return null
  return scoreToLevel(r.score)
}

export default function App() {
  const sessionActiveRef = useRef(false)
  const face = useFaceStress(sessionActiveRef)
  const audio = useAudioStress()
  const history = useStressHistory()

  const sessionRef = useRef<{ start: () => void }>({ start: () => {} })

  const scheduler = useIntervalScheduler(() => {
    void sessionRef.current.start()
  })

  const session = useSessionManager(
    face,
    audio,
    history,
    scheduler.notifySessionCompleted,
    sessionActiveRef,
  )

  useEffect(() => {
    sessionRef.current = { start: () => void session.startSession() }
    // session.startSession is stable from useCallback; full session object changes each render
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync ref to latest startSession
  }, [session.startSession])

  const [cameraPref, setCameraPref] = useState(true)
  const [micPref, setMicPref] = useState(true)

  const displayScore =
    session.phase === 'complete' && session.sessionResult
      ? session.sessionResult.score
      : session.liveScore

  const displayLevel =
    session.phase === 'complete' && session.sessionResult
      ? session.sessionResult.level
      : session.liveLevel

  const lowConfidence =
    Boolean(session.sessionResult?.lowConfidence) ||
    (session.phase === 'running' && session.secondsLeft <= 3 && session.faceSampleCount < 3)

  const guideHighlight: StressLevel | null =
    session.sessionResult?.level ??
    recordToGuideLevel(history.records[0])

  const onStartCheck = () => {
    if (!cameraPref || !micPref) {
      window.alert('Enable camera and microphone in the footer to run a check.')
      return
    }
    if (!face.modelsReady) {
      window.alert('Face models are still loading. Please wait.')
      return
    }
    void session.startSession()
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 pb-40 pt-6 text-zinc-100 sm:px-6">
      <CheckInNotification
        visible={scheduler.showBanner}
        onStartNow={scheduler.startNow}
        onSnooze={scheduler.snooze}
        onDismiss={scheduler.dismissBanner}
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            SilentVitals
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Stress check-in
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            15-second session · Face samples every 3s · Local-only processing
          </p>

          <div className="mt-6 flex flex-col items-center gap-4">
            {session.phase === 'running' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <div
                    className="absolute inset-0 animate-pulse rounded-full border-4 border-emerald-500/50"
                    aria-hidden
                  />
                  <div className="relative z-10 text-center">
                    <p className="text-xs text-zinc-400">Checking…</p>
                    <p className="text-2xl font-bold tabular-nums text-white">
                      {session.secondsLeft}s
                    </p>
                    <p className="text-[10px] text-zinc-500">left</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => session.stopSession()}
                  className="rounded-full border border-red-500/50 bg-red-950/50 px-6 py-2 text-sm font-medium text-red-200 hover:bg-red-950/70"
                >
                  Stop
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartCheck}
                disabled={face.modelsLoading || Boolean(face.loadError)}
                className="rounded-full bg-emerald-600 px-10 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Check
              </button>
            )}

            <p className="text-xs text-zinc-500">
              Next check-in in{' '}
              <span className="font-mono text-zinc-300">{scheduler.minutesUntilNext}</span> min
            </p>
          </div>

          <p className="mx-auto mt-4 max-w-xl rounded-full border border-emerald-500/25 bg-emerald-950/30 px-4 py-2 text-xs text-emerald-200/90">
            100% private — runs locally in your browser. Nothing is uploaded.
          </p>
        </header>

        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-xl ring-1 ring-white/5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
            <div className="flex min-w-0 flex-1 flex-col">
              <VideoFeed
                videoRef={face.videoRef}
                canvasRef={face.canvasRef}
                sessionRunning={session.phase === 'running'}
                modelsLoading={face.modelsLoading}
                loadProgress={face.loadProgress}
                loadError={face.loadError}
                mediaError={session.mediaError}
              />
            </div>
            <div className="flex w-full flex-col gap-6 lg:max-w-md lg:w-[min(100%,26rem)]">
              <StressDisplay
                score={displayScore}
                level={displayLevel}
                chartPoints={session.chartPoints}
                chartWindowEnd={session.chartWindowEnd}
                lowConfidence={lowConfidence}
                phase={session.phase}
                sessionResult={session.sessionResult}
              />

              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-300">Today&apos;s trend</h3>
                <TrendChart records={history.todayRecords} />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800">
                    <p className="text-[10px] uppercase text-zinc-500">Average</p>
                    <p className="font-mono text-lg text-zinc-100">
                      {history.todayStats.average.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800">
                    <p className="text-[10px] uppercase text-zinc-500">Highest</p>
                    <p className="font-mono text-lg text-zinc-100">
                      {history.todayStats.highest.toFixed(0)}
                    </p>
                    {history.todayStats.highestTime && (
                      <p className="text-[10px] text-zinc-500">
                        {new Date(history.todayStats.highestTime).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800">
                    <p className="text-[10px] uppercase text-zinc-500">Check-ins today</p>
                    <p className="font-mono text-lg text-zinc-100">{history.todayStats.total}</p>
                  </div>
                </div>
              </div>

              <HistoryLog records={history.records} />

              <SettingsPanel
                intervalMinutes={scheduler.intervalMinutes}
                onIntervalChange={(m) => scheduler.setIntervalMinutes(m)}
                onClearData={() => {
                  history.clearAll()
                  history.refresh()
                }}
              />
            </div>
          </div>

          <footer className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-zinc-800 pt-4 text-xs">
            <Toggle
              label="Camera"
              enabled={cameraPref}
              onChange={() => setCameraPref((v) => !v)}
            />
            <Toggle
              label="Microphone"
              enabled={micPref}
              onChange={() => setMicPref((v) => !v)}
            />
          </footer>
        </div>

        <StressGuidePanel highlightLevel={guideHighlight} />
      </div>
    </div>
  )
}

function Toggle({
  label,
  enabled,
  onChange,
}: {
  label: string
  enabled: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium transition ${
        enabled
          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
          : 'border-zinc-600 bg-zinc-800/80 text-zinc-500'
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`}
        aria-hidden
      />
      {label}: {enabled ? 'on' : 'off'}
    </button>
  )
}
