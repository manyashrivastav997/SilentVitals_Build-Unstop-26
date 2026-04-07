import { useEffect, useRef, useState } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { CheckInNotification } from './CheckInNotification'
import { HistoryLog } from './HistoryLog'
import { SettingsPanel } from './SettingsPanel'
import { StressDisplay } from './StressDisplay'
import { StressGuidePanel } from './StressGuidePanel'
import { TrendChart } from './TrendChart'
import { VideoFeed } from './VideoFeed'
import { useUser } from '../contexts/UserContext'
import { useAudioStress } from '../hooks/useAudioStress'
import { useFaceStress } from '../hooks/useFaceStress'
import { useIntervalScheduler } from '../hooks/useIntervalScheduler'
import { scoreToLevel } from '../hooks/useStressAggregator'
import type { StressLevel } from '../hooks/useStressAggregator'
import { useSessionManager } from '../hooks/useSessionManager'
import { useStressHistory, type StressRecord } from '../hooks/useStressHistory'
import {
  getBlinkRateHistory,
  getFatigueHistory,
  getHeartRateHistory,
  getLatestBlinkRate,
  getLatestFatigue,
  getLatestHeartRate,
  saveBlinkRateRecord,
  saveFatigueRecord,
} from '../db/indexedDb'
import type { BlinkRateRecord, FatigueRecord, HeartRateRecord } from '../types/db'
import { HeartRateChart } from './shared/HeartRateChart'
import ManualHeartRateEntry from './ManualHeartRateEntry'
import { BlinkRateChart } from './shared/BlinkRateChart'
import { FatigueTrendChart } from './shared/FatigueTrendChart'
import { useBlinkDetection } from '../hooks/useBlinkDetection'
import { useFatigueCalculation } from '../hooks/useFatigueCalculation'

function recordToGuideLevel(r: StressRecord | undefined): StressLevel | null {
  if (!r) return null
  return scoreToLevel(r.score)
}

export default function StressCheckinApp({ roleLabel }: { roleLabel: string }) {
  const { logout, permissions, currentUser, selected } = useUser()

  // Home guardian: strictly view-only, no camera/mic initialization.
  if (selected?.mode === 'home' && permissions.isGuardian) {
    return <HomeGuardianVitalsView roleLabel={roleLabel} />
  }

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
    session.sessionResult?.level ?? recordToGuideLevel(history.records[0])

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

  const userId = currentUser?.patientId ?? currentUser?.id ?? 'home-patient-1'
  const [hrHistory, setHrHistory] = useState<HeartRateRecord[]>([])
  const [latestHr, setLatestHr] = useState<HeartRateRecord | null>(null)
  const [blinkRateHistory, setBlinkRateHistory] = useState<BlinkRateRecord[]>([])
  const [latestBlinkRate, setLatestBlinkRate] = useState<BlinkRateRecord | null>(null)
  const [fatigueHistory, setFatigueHistory] = useState<FatigueRecord[]>([])
  const [latestFatigue, setLatestFatigue] = useState<FatigueRecord | null>(null)
  const [showHrModal, setShowHrModal] = useState(false)

  const refreshVitals = async () => {
    const [hh, hl, bh, bl, fh, fl] = await Promise.all([
      getHeartRateHistory(userId, 7),
      getLatestHeartRate(userId),
      getBlinkRateHistory(userId, 24 * 60),
      getLatestBlinkRate(userId),
      getFatigueHistory(userId, 24),
      getLatestFatigue(userId),
    ])
    setHrHistory(hh)
    setLatestHr(hl)
    setBlinkRateHistory(bh)
    setLatestBlinkRate(bl)
    setFatigueHistory(fh)
    setLatestFatigue(fl)
  }

  useEffect(() => {
    void refreshVitals()
    const id = window.setInterval(() => void refreshVitals(), 30_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const blink = useBlinkDetection({ videoRef: face.videoRef, isActive: session.phase === 'running' })
  const fatigue = useFatigueCalculation({
    blinkRate: blink.blinkRate,
    stressLevel:
      session.phase === 'complete' && session.sessionResult ? session.sessionResult.score : session.liveScore,
    timeOfDay: new Date().getHours(),
    sessionDuration: session.phase === 'running' ? (15 - session.secondsLeft) / 60 : undefined,
    eyeClosureDuration: blink.eyeClosureDuration,
  })

  useEffect(() => {
    if (session.phase !== 'complete' || !session.sessionResult) return
    void (async () => {
      if (blink.blinkRate != null) {
        await saveBlinkRateRecord({
          patientId: userId,
          timestamp: new Date(),
          blinksPerMinute: blink.blinkRate,
          eyeClosureDuration: blink.eyeClosureDuration || undefined,
          confidence: blink.confidence,
          context: 'screen',
        })
      }
      if (fatigue) {
        await saveFatigueRecord({
          patientId: userId,
          timestamp: new Date(),
          score: fatigue.score,
          level: fatigue.level,
          contributingFactors: fatigue.contributingFactors,
          recommendation: fatigue.recommendation,
        })
      }
      await refreshVitals()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase, session.sessionResult])

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black px-4 pb-40 pt-4 text-zinc-100 sm:px-6">
      <header className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-3 ring-1 ring-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
            SV
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SilentVitals</p>
            <p className="text-[11px] text-slate-500">Stress Detection System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-200">
            {roleLabel}
          </span>
          <button
            type="button"
            className="rounded-full bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      <CheckInNotification
        visible={scheduler.showBanner}
        onStartNow={scheduler.startNow}
        onSnooze={scheduler.snooze}
        onDismiss={scheduler.dismissBanner}
      />

      <div className="mx-auto mt-5 flex max-w-5xl flex-col gap-6">
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
            <div className="flex w-full flex-col gap-6 lg:w-[min(100%,26rem)] lg:max-w-md">
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

              <div className="rounded-2xl border border-orange-800/30 bg-slate-950/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Vitals</p>
                  {selected?.mode === 'home' && selected.role === 'patient' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowHrModal(true)}
                        className="rounded-full bg-orange-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-orange-700"
                      >
                        + Log HR
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-800/60">
                    <p className="text-xs text-slate-400">❤️ Heart rate</p>
                    <p className="mt-1 text-xl font-semibold text-rose-300">
                      {latestHr ? `${latestHr.bpm} BPM` : '—'}
                    </p>
                    <div className="mt-2">
                      <HeartRateChart data={hrHistory} height={60} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-800/60">
                    <p className="text-xs text-slate-400">😴 Fatigue</p>
                    <p
                      className="mt-1 text-xl font-semibold"
                      style={{
                        color:
                          latestFatigue?.score == null
                            ? '#a1a1aa'
                            : latestFatigue.score <= 33
                            ? '#22c55e'
                            : latestFatigue.score <= 66
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {latestFatigue ? `${latestFatigue.score}/100` : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {latestFatigue
                        ? latestFatigue.level === 'alert'
                          ? 'Alert'
                          : latestFatigue.level === 'mild_fatigue'
                          ? 'Mild fatigue'
                          : 'Significant fatigue'
                        : 'Looking at camera to measure fatigue'}
                    </p>
                    <div className="mt-2">
                      <BlinkRateChart data={blinkRateHistory} height={60} />
                    </div>
                    <div className="mt-2">
                      <FatigueTrendChart data={fatigueHistory} height={60} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Blink: {latestBlinkRate ? `${latestBlinkRate.blinksPerMinute} BPM` : '—'} ·{' '}
                      {blink.isDetecting ? 'tracking' : 'offline'}
                    </p>
                  </div>
                </div>
              </div>
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

        {permissions.showTipsPanel && <StressGuidePanel highlightLevel={guideHighlight} />}
      </div>

      {showHrModal && (
        <ManualHeartRateEntry
          patientId={userId}
          onSave={() => void refreshVitals()}
          onClose={() => setShowHrModal(false)}
        />
      )}
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
        className={`inline-block h-2 w-2 rounded-full ${
          enabled ? 'bg-emerald-400' : 'bg-zinc-600'
        }`}
        aria-hidden
      />
      {label}: {enabled ? 'on' : 'off'}
    </button>
  )
}

function HomeGuardianVitalsView({ roleLabel }: { roleLabel: string }) {
  const { logout, currentUser } = useUser()
  const patientId = currentUser?.patientId ?? 'home-patient-1'
  const [hrHistory, setHrHistory] = useState<HeartRateRecord[]>([])
  const [latestHr, setLatestHr] = useState<HeartRateRecord | null>(null)
  const [blinkRateHistory, setBlinkRateHistory] = useState<BlinkRateRecord[]>([])
  const [latestBlinkRate, setLatestBlinkRate] = useState<BlinkRateRecord | null>(null)
  const [fatigueHistory, setFatigueHistory] = useState<FatigueRecord[]>([])
  const [latestFatigue, setLatestFatigue] = useState<FatigueRecord | null>(null)

  useEffect(() => {
    void (async () => {
      const [hh, hl, bh, bl, fh, fl] = await Promise.all([
        getHeartRateHistory(patientId, 7),
        getLatestHeartRate(patientId),
        getBlinkRateHistory(patientId, 24 * 60),
        getLatestBlinkRate(patientId),
        getFatigueHistory(patientId, 24),
        getLatestFatigue(patientId),
      ])
      setHrHistory(hh)
      setLatestHr(hl)
      setBlinkRateHistory(bh)
      setLatestBlinkRate(bl)
      setFatigueHistory(fh)
      setLatestFatigue(fl)
    })()
  }, [patientId])

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black px-4 pb-16 pt-4 text-zinc-100 sm:px-6">
      <header className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-3 ring-1 ring-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-300">
            SV
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SilentVitals</p>
            <p className="text-[11px] text-slate-500">Guardian view (home)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-200">
            {roleLabel}
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-5xl space-y-4">
        <div className="rounded-2xl border border-purple-800/30 bg-slate-900/40 p-4">
          <p className="text-sm font-semibold text-white">View-only monitoring</p>
          <p className="mt-1 text-sm text-slate-400">
            Guardians cannot start checks or use camera/microphone.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-purple-800/30 bg-slate-900/50 p-4">
            <p className="text-sm font-semibold text-white">❤️ Heart rate</p>
            <p className="mt-2 text-2xl font-semibold text-rose-300">
              {latestHr ? `${latestHr.bpm} BPM` : '—'}
            </p>
            <div className="mt-3">
              <HeartRateChart data={hrHistory} height={90} />
            </div>
          </div>
          <div className="rounded-2xl border border-purple-800/30 bg-slate-900/50 p-4">
            <p className="text-sm font-semibold text-white">😴 Fatigue</p>
            <p
              className="mt-2 text-2xl font-semibold"
              style={{
                color:
                  latestFatigue?.score == null
                    ? '#a1a1aa'
                    : latestFatigue.score <= 33
                    ? '#22c55e'
                    : latestFatigue.score <= 66
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            >
              {latestFatigue ? `${latestFatigue.score}/100` : '—'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {latestFatigue
                ? latestFatigue.level === 'alert'
                  ? 'Alert'
                  : latestFatigue.level === 'mild_fatigue'
                  ? 'Mild fatigue'
                  : 'Significant fatigue'
                : 'No data yet'}
            </p>
            <div className="mt-3">
              <BlinkRateChart data={blinkRateHistory} height={90} />
            </div>
            <div className="mt-3">
              <FatigueTrendChart data={fatigueHistory} height={90} />
            </div>
            <p className="mt-2 text-[12px] text-slate-400">
              Blink: {latestBlinkRate ? `${latestBlinkRate.blinksPerMinute} BPM` : '—'}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

