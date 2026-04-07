import { useEffect, useMemo, useState } from 'react'
import { LogOut, Phone } from 'lucide-react'
import { CheckInNotification } from './CheckInNotification'
import { StressGauge } from './shared/StressGauge'
import { StressHistoryChart } from './shared/StressHistoryChart'
import {
  getBlinkRateHistory,
  getFatigueHistory,
  getHeartRateHistory,
  getLatestBlinkRate,
  getLatestFatigue,
  getLatestHeartRate,
  getPatientDashboardData,
  markPatientCheckMissed,
} from '../db/indexedDb'
import type { StressRecord } from '../types/db'
import type { BlinkRateRecord, FatigueRecord, HeartRateRecord } from '../types/db'
import { usePatientScheduler } from '../hooks/usePatientScheduler'
import { useUser } from '../contexts/UserContext'
import { HeartRateChart } from './shared/HeartRateChart'
import { BlinkRateChart } from './shared/BlinkRateChart'
import { FatigueTrendChart } from './shared/FatigueTrendChart'

export default function HospitalPatientDashboard({
  patientId,
  onStartCheck,
}: {
  patientId: string
  onStartCheck: () => void
}) {
  const { logout } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof getPatientDashboardData>> | null>(
    null,
  )
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateRecord[]>([])
  const [latestHeartRate, setLatestHeartRate] = useState<HeartRateRecord | null>(null)
  const [blinkRateHistory, setBlinkRateHistory] = useState<BlinkRateRecord[]>([])
  const [latestBlinkRate, setLatestBlinkRate] = useState<BlinkRateRecord | null>(null)
  const [fatigueHistory, setFatigueHistory] = useState<FatigueRecord[]>([])
  const [latestFatigue, setLatestFatigue] = useState<FatigueRecord | null>(null)

  const refresh = async () => {
    setError(null)
    try {
      const [d, hrHist, hrLatest, blinkHist, blinkLatest, fatHist, fatLatest] = await Promise.all([
        getPatientDashboardData(patientId),
        getHeartRateHistory(patientId, 7),
        getLatestHeartRate(patientId),
        getBlinkRateHistory(patientId, 24 * 60),
        getLatestBlinkRate(patientId),
        getFatigueHistory(patientId, 24),
        getLatestFatigue(patientId),
      ])
      setData(d)
      setHeartRateHistory(hrHist)
      setLatestHeartRate(hrLatest)
      setBlinkRateHistory(blinkHist)
      setLatestBlinkRate(blinkLatest)
      setFatigueHistory(fatHist)
      setLatestFatigue(fatLatest)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 30_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const scheduler = usePatientScheduler({
    patientId,
    lastCheckIn: data?.patient.lastCheckIn ?? new Date(),
    intervalMinutes: data?.patient.intervalMinutes ?? 30,
    onStartNow: onStartCheck,
    onMissed: (dueAt) => {
      void markPatientCheckMissed(patientId, dueAt).finally(() => void refresh())
    },
  })

  const latest = data?.latestStressRecord ?? null
  const latestScore = latest?.status === 'missed' ? null : latest?.score ?? null
  const latestLevel =
    latest?.status === 'missed'
      ? { label: 'Missed', color: 'text-rose-200' }
      : latestScore == null
      ? { label: 'No data', color: 'text-slate-300' }
      : latestScore <= 33
      ? { label: 'Low', color: 'text-emerald-300' }
      : latestScore <= 66
      ? { label: 'Medium', color: 'text-amber-300' }
      : { label: 'High', color: 'text-rose-300' }

  const lastCheckMinutes = data
    ? Math.max(0, Math.round((Date.now() - +new Date(data.patient.lastCheckIn)) / 60000))
    : 0

  const nextCheckMinutes = data ? scheduler.minutesUntilNext : 0

  const todayStats = useMemo(() => {
    const records = (data?.todayStressRecords ?? []).filter((r) => r.status !== 'missed')
    if (records.length === 0) {
      return { current: null as number | null, highest: null as number | null, highestTime: null as Date | null, lowest: null as number | null, lowestTime: null as Date | null }
    }
    const current = records[records.length - 1]!.score
    let highest = records[0]!.score
    let lowest = records[0]!.score
    let highestTime = new Date(records[0]!.timestamp)
    let lowestTime = new Date(records[0]!.timestamp)
    for (const r of records) {
      if (r.score > highest) {
        highest = r.score
        highestTime = new Date(r.timestamp)
      }
      if (r.score < lowest) {
        lowest = r.score
        lowestTime = new Date(r.timestamp)
      }
    }
    return { current, highest, highestTime, lowest, lowestTime }
  }, [data?.todayStressRecords])

  const recent10 = useMemo(() => {
    const week = data?.weekStressRecords ?? []
    return week
      .slice()
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 10)
  }, [data?.weekStressRecords])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        Loading your dashboard…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        Unable to load patient data.
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black text-slate-50">
      <CheckInNotification
        visible={scheduler.showBanner}
        onStartNow={scheduler.startNow}
        onSnooze={scheduler.snooze}
        onDismiss={scheduler.dismissBanner}
      />

      <header className="w-full bg-emerald-950 border-b border-emerald-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              SilentVitals · Hospital
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              Welcome back, {data.patient.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden sm:block text-xs text-emerald-100/80">
              {scheduler.now.toLocaleDateString()} • {scheduler.now.toLocaleTimeString()}
            </p>
            <p className="hidden md:block text-xs text-emerald-100/80">
              👨‍⚕️ {data.careTeam.doctorName} | 👩‍⚕️ {data.careTeam.nurseName}
            </p>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
            {error}{' '}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-emerald-800/30 bg-slate-900/40 p-4 text-sm text-emerald-100/90">
          🔒 Your data is private and secure. Only your care team can view this information.
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-6 text-center shadow-lg shadow-black/30">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              🫀 Your current stress
            </p>
            <div className="mt-6 flex justify-center">
              <StressGauge score={latestScore ?? 0} showLabel diameterPx={200} />
            </div>
            <p className={`mt-4 text-lg font-semibold ${latestLevel.color}`}>
              {latestScore == null ? 'No recent stress data' : `${latestLevel.label} Stress`}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Last check: {lastCheckMinutes} minutes ago
            </p>
            <p className="text-sm text-slate-300">
              Next check: in {nextCheckMinutes} minutes
            </p>

            {data.weekStressRecords.filter((r) => r.status !== 'missed').length === 0 ? (
              <div className="mt-5 rounded-2xl border border-emerald-800/30 bg-slate-950/50 p-5">
                <p className="text-sm font-semibold text-slate-100">
                  📊 No stress data available yet
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Click &quot;Start Check&quot; to begin monitoring your stress levels.
                </p>
                <button
                  type="button"
                  onClick={onStartCheck}
                  className="mt-4 min-h-[48px] w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                >
                  Start First Check
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onStartCheck}
                className="mt-6 min-h-[48px] rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Start Check
              </button>
            )}

            <p className="mt-4 text-[12px] text-slate-400">
              Remember: Stress is a normal response. Your care team is here to help.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 text-left">
              <div className="bg-slate-900/50 rounded-xl border border-emerald-800/30 p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                  ❤️ Your Heart Rate
                </h3>
                {latestHeartRate ? (
                  <>
                    <p className="text-3xl font-semibold text-rose-300">
                      {latestHeartRate.bpm} BPM
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Last measured: {new Date(latestHeartRate.timestamp).toLocaleString()}
                    </p>
                    <div className="mt-3">
                      <HeartRateChart data={heartRateHistory} height={70} />
                    </div>
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Heart rate data will appear here after checks
                  </p>
                )}
              </div>

              <div className="bg-slate-900/50 rounded-xl border border-emerald-800/30 p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                  😴 Your Fatigue
                </h3>
                {latestFatigue ? (
                  <>
                    <p
                      className="text-3xl font-semibold"
                      style={{
                        color:
                          latestFatigue.score <= 33
                            ? '#22c55e'
                            : latestFatigue.score <= 66
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {latestFatigue.score}/100
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                        latestFatigue.level === 'alert'
                          ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/20'
                          : latestFatigue.level === 'mild_fatigue'
                          ? 'bg-amber-500/15 text-amber-200 ring-amber-500/20'
                          : 'bg-rose-500/15 text-rose-200 ring-rose-500/20'
                      }`}
                    >
                      {latestFatigue.level === 'alert'
                        ? 'Alert'
                        : latestFatigue.level === 'mild_fatigue'
                        ? 'Mild fatigue'
                        : 'Significant fatigue'}
                    </span>
                    <div className="mt-3">
                      <BlinkRateChart data={blinkRateHistory} height={70} />
                    </div>
                    <div className="mt-3">
                      <FatigueTrendChart data={fatigueHistory} height={70} />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Blink rate: {latestBlinkRate?.blinksPerMinute ?? '—'} BPM
                    </p>
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Fatigue data will appear during stress checks
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                👨‍⚕️ Your care team
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-emerald-800/25">
                  <p className="text-xs text-slate-400">Attending Doctor</p>
                  <p className="mt-1 text-sm font-semibold text-white">{data.careTeam.doctorName}</p>
                  <p className="mt-1 text-xs text-slate-400">Internal Med</p>
                </div>
                <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-emerald-800/25">
                  <p className="text-xs text-slate-400">Primary Nurse</p>
                  <p className="mt-1 text-sm font-semibold text-white">{data.careTeam.nurseName}</p>
                  <p className="mt-1 text-xs text-slate-400">RN, BSN</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-300">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-300" />
                  Hospital Main: (555) 123-4567
                </p>
                <p className="text-slate-400">
                  🏥 Room {data.patient.roomNumber}, Bed {data.patient.bedNumber}
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                ⏰ Next scheduled check-in
              </p>
              <p className="mt-3 text-sm text-slate-300">
                In <span className="font-semibold text-white">{scheduler.minutesUntilNext}</span>{' '}
                minutes
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-950 ring-1 ring-emerald-800/25">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((data.patient.intervalMinutes - scheduler.minutesUntilNext) /
                          data.patient.intervalMinutes) *
                          100,
                      ),
                    ).toFixed(0)}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-[12px] text-slate-400">
                Take deep breaths between checks.
              </p>
            </section>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            📈 Today&apos;s stress trend
          </p>
          <div className="mt-4">
            <StressHistoryChart data={data.todayStressRecords.filter((r) => r.status !== 'missed')} height={220} color="emerald" />
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-950/40 px-4 py-3 ring-1 ring-emerald-800/20">
              <p className="text-xs text-slate-500">Current</p>
              <p className="mt-1 font-mono text-lg text-white">
                {todayStats.current == null ? '—' : `${Math.round(todayStats.current)}%`}
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/40 px-4 py-3 ring-1 ring-emerald-800/20">
              <p className="text-xs text-slate-500">Highest today</p>
              <p className="mt-1 font-mono text-lg text-white">
                {todayStats.highest == null ? '—' : `${Math.round(todayStats.highest)}%`}
              </p>
              {todayStats.highestTime && (
                <p className="text-[11px] text-slate-500">
                  at {todayStats.highestTime.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-950/40 px-4 py-3 ring-1 ring-emerald-800/20">
              <p className="text-xs text-slate-500">Lowest today</p>
              <p className="mt-1 font-mono text-lg text-white">
                {todayStats.lowest == null ? '—' : `${Math.round(todayStats.lowest)}%`}
              </p>
              {todayStats.lowestTime && (
                <p className="text-[11px] text-slate-500">
                  at {todayStats.lowestTime.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            🕐 Recent check-ins (last 10)
          </p>

          <div className="mt-4 hidden md:block">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="border-b border-emerald-800/30 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent10.map((r) => (
                  <tr key={r.id} className="border-b border-slate-900/60">
                    <td className="px-3 py-2 text-slate-300">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {r.status === 'missed' ? '—' : `${Math.round(r.score)}%`}
                    </td>
                    <td className="px-3 py-2">{levelBadge(r)}</td>
                    <td className="px-3 py-2">
                      {r.status === 'missed' ? (
                        <span className="text-rose-200">❌ Missed</span>
                      ) : (
                        <span className="text-emerald-200">Complete ✅</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recent10.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={4}>
                      No check-ins yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {recent10.length === 0 && (
              <p className="text-sm text-slate-500">No check-ins yet.</p>
            )}
            {recent10.map((r) => (
              <div key={r.id} className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-emerald-800/25">
                <p className="text-sm text-slate-200">🕐 {new Date(r.timestamp).toLocaleTimeString()}</p>
                <p className="mt-1 text-sm text-slate-300">
                  Score:{' '}
                  <span className="font-mono text-white">
                    {r.status === 'missed' ? '—' : `${Math.round(r.score)}%`}
                  </span>{' '}
                  {r.status === 'missed' ? '' : levelBadge(r)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Status:{' '}
                  {r.status === 'missed' ? (
                    <span className="text-rose-200">Missed ❌</span>
                  ) : (
                    <span className="text-emerald-200">Complete ✅</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-slate-900/50 border border-emerald-800/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Emergency contact
          </p>
          <p className="mt-2 text-sm text-slate-300">
            If you feel unwell or unsafe, please call the hospital main line or notify staff immediately.
          </p>
          <button
            type="button"
            className="mt-4 min-h-[48px] rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            onClick={() => window.alert('Call: (555) 123-4567')}
          >
            Call Hospital Main
          </button>
        </section>
      </main>
    </div>
  )
}

function levelBadge(r: StressRecord) {
  if (r.status === 'missed') return <span className="text-slate-400">—</span>
  const lvl = r.level
  const cls =
    lvl === 'Low'
      ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[12px] text-emerald-200'
      : lvl === 'Medium'
      ? 'rounded-full bg-amber-500/15 px-2 py-0.5 text-[12px] text-amber-200'
      : 'rounded-full bg-rose-500/15 px-2 py-0.5 text-[12px] text-rose-200'
  return <span className={cls}>{lvl}</span>
}

