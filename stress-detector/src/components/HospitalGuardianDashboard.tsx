import { useEffect, useMemo, useState } from 'react'
import { LogOut, Phone } from 'lucide-react'
import { useUser } from '../contexts/UserContext'
import {
  getGuardianStats,
  getBlinkRateHistory,
  getFatigueHistory,
  getHeartRateHistory,
  getLatestBlinkRate,
  getLatestFatigue,
  getLatestHeartRate,
  getPatientForGuardian,
  getWeeklySummary,
} from '../db/indexedDb'
import { StressGauge } from './shared/StressGauge'
import { StressHistoryChart } from './shared/StressHistoryChart'
import { ContactCard } from './shared/ContactCard'
import type { BlinkRateRecord, FatigueRecord, HeartRateRecord, StressRecord } from '../types/db'
import { HeartRateChart } from './shared/HeartRateChart'
import { BlinkRateChart } from './shared/BlinkRateChart'
import { FatigueTrendChart } from './shared/FatigueTrendChart'

export default function HospitalGuardianDashboard({
  patientId,
  guardianId,
  relationship,
}: {
  patientId: string
  guardianId: string
  relationship: string
}) {
  const { currentUser, logout } = useUser()
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof getPatientForGuardian>> | null>(null)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getGuardianStats>> | null>(null)
  const [weekly, setWeekly] = useState<Awaited<ReturnType<typeof getWeeklySummary>> | null>(null)
  const [newRecordPulse, setNewRecordPulse] = useState(false)
  const [lastLatestId, setLastLatestId] = useState<string | null>(null)
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateRecord[]>([])
  const [latestHeartRate, setLatestHeartRate] = useState<HeartRateRecord | null>(null)
  const [blinkRateHistory, setBlinkRateHistory] = useState<BlinkRateRecord[]>([])
  const [latestBlinkRate, setLatestBlinkRate] = useState<BlinkRateRecord | null>(null)
  const [fatigueHistory, setFatigueHistory] = useState<FatigueRecord[]>([])
  const [latestFatigue, setLatestFatigue] = useState<FatigueRecord | null>(null)

  const refresh = async () => {
    setError(null)
    try {
      const [d, s, w] = await Promise.all([
        getPatientForGuardian(patientId, guardianId),
        getGuardianStats(patientId),
        getWeeklySummary(patientId),
      ])
      const [hrHist, hrLatest, blinkHist, blinkLatest, fatHist, fatLatest] = await Promise.all([
        getHeartRateHistory(patientId, 7),
        getLatestHeartRate(patientId),
        getBlinkRateHistory(patientId, 24 * 60),
        getLatestBlinkRate(patientId),
        getFatigueHistory(patientId, 24),
        getLatestFatigue(patientId),
      ])
      const latestId = d.latestStressRecord?.id ?? null
      if (latestId && lastLatestId && latestId !== lastLatestId) {
        setNewRecordPulse(true)
        window.setTimeout(() => setNewRecordPulse(false), 1200)
      }
      setLastLatestId(latestId)
      setData(d)
      setStats(s)
      setWeekly(w)
      setHeartRateHistory(hrHist)
      setLatestHeartRate(hrLatest)
      setBlinkRateHistory(blinkHist)
      setLatestBlinkRate(blinkLatest)
      setFatigueHistory(fatHist)
      setLatestFatigue(fatLatest)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load guardian dashboard')
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 30_000)
    const tid = window.setInterval(() => setNow(new Date()), 30_000)
    return () => {
      window.clearInterval(id)
      window.clearInterval(tid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, guardianId])

  const latest = data?.latestStressRecord ?? null
  const latestScore = latest?.status === 'missed' ? null : latest?.score ?? null

  const lastCheckMinutes = data
    ? Math.max(0, Math.round((Date.now() - +new Date(data.patient.lastCheckIn)) / 60000))
    : 0
  const nextInMin = data
    ? Math.max(0, Math.round((+new Date(data.nextScheduledCheck) - Date.now()) / 60000))
    : 0

  const todayCompleted = stats?.completedChecks ?? 0
  const todayMissed = stats?.missedChecks ?? 0
  const todayTotal = todayCompleted + todayMissed

  const recent10 = useMemo(() => {
    const week = data?.weekStressRecords ?? []
    return week
      .slice()
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 10)
  }, [data?.weekStressRecords])

  const todayRecords = useMemo(() => {
    return (data?.todayStressRecords ?? []).filter((r) => r.status !== 'missed')
  }, [data?.todayStressRecords])

  const trendInsight = useMemo(() => {
    if (todayRecords.length < 3) return 'Waiting for more data to analyze trends.'
    // crude demo: find the hour bucket with highest average
    const buckets = new Map<number, { sum: number; n: number }>()
    for (const r of todayRecords) {
      const h = new Date(r.timestamp).getHours()
      const b = buckets.get(h) ?? { sum: 0, n: 0 }
      b.sum += r.score
      b.n += 1
      buckets.set(h, b)
    }
    let bestH = 0
    let bestAvg = -1
    for (const [h, v] of buckets) {
      const avg = v.sum / v.n
      if (avg > bestAvg) {
        bestAvg = avg
        bestH = h
      }
    }
    const label = new Date(new Date().setHours(bestH, 0, 0, 0)).toLocaleTimeString([], {
      hour: 'numeric',
    })
    return `Stress tends to peak around ${label} based on today's readings.`
  }, [todayRecords])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        Loading guardian dashboard…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        Patient data unavailable.
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black text-slate-50">
      <header className="w-full bg-purple-950 border-b border-purple-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
              Guardian Dashboard · {currentUser?.name ?? 'Guardian'}
            </p>
            <p className="mt-1 text-sm text-purple-100/85">
              Monitoring: <span className="font-semibold text-white">{data.patient.name}</span>{' '}
              ({relationship})
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden sm:block text-xs text-purple-100/80">
              {now.toLocaleDateString()} • {now.toLocaleTimeString()}
            </p>
            <span className="hidden md:inline-flex items-center gap-2 rounded-full bg-purple-900/40 px-3 py-1 text-[11px] text-purple-100 ring-1 ring-purple-800/40">
              📞 Hospital: (555) 123-4567
            </span>
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

        <div className="mb-6 rounded-2xl bg-purple-900/30 border-l-4 border-purple-500 border border-purple-800/30 p-4">
          <p className="text-sm font-semibold text-white">
            👤 Monitoring: {data.patient.name}
          </p>
          <p className="mt-1 text-sm text-purple-100/80">
            Room {data.patient.roomNumber} · Bed {data.patient.bedNumber} | Admitted:{' '}
            {new Date(data.patient.admissionDate).toLocaleDateString()}
          </p>
          <p className="mt-1 text-sm text-purple-100/80">
            Relationship: {relationship} | Guardian since: {new Date().toLocaleDateString()}
          </p>
          <p className="mt-2 text-[12px] text-purple-100/80">
            🔒 You are in view-only mode. You cannot start checks.
          </p>
          <p className="mt-2 text-[11px] text-purple-300">Updated just now 🔄</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-2xl bg-slate-900/50 border border-purple-800/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
                🫀 Current stress status
              </p>
              <div className={`mt-5 flex justify-center ${newRecordPulse ? 'animate-pulse' : ''}`}>
                <StressGauge score={latestScore ?? 0} showLabel diameterPx={180} />
              </div>
              <p className="mt-4 text-center text-sm text-slate-300">
                Last check: {lastCheckMinutes} minutes ago · Next scheduled: in {nextInMin} minutes
              </p>
              <p className="mt-3 text-center text-sm text-slate-200">
                Status:{' '}
                {latest?.status === 'missed' ? (
                  <span className="text-rose-200">🔴 Missed check</span>
                ) : (
                  <span className="text-amber-200">🟡 Active monitoring</span>
                )}
              </p>
            </section>

            <ContactCard title="👨‍⚕️👩‍⚕️ Care team contact">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-purple-900/50 p-4">
                  <p className="text-xs text-purple-200/80">Attending Doctor</p>
                  <p className="mt-1 text-sm font-semibold text-white">{data.careTeam.doctorName}</p>
                  <p className="mt-1 text-xs text-purple-100/80">Internal Med</p>
                  <p className="mt-2 text-sm text-purple-100/90">📞 {data.careTeam.doctorContact ?? 'ext. —'}</p>
                </div>
                <div className="rounded-2xl bg-purple-900/50 p-4">
                  <p className="text-xs text-purple-200/80">Primary Nurse</p>
                  <p className="mt-1 text-sm font-semibold text-white">{data.careTeam.nurseName}</p>
                  <p className="mt-1 text-xs text-purple-100/80">RN, BSN</p>
                  <p className="mt-2 text-sm text-purple-100/90">📞 {data.careTeam.nurseContact ?? 'ext. —'}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-200">
                <p>🏥 Hospital Main: (555) 123-4567</p>
                <p className="text-slate-400">🚨 Emergency: Dial 0 from room phone</p>
                <p className="text-slate-400">📧 patient.family@hospital.org</p>
              </div>
            </ContactCard>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl bg-slate-900/50 border border-purple-800/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
                📊 Vital signs & stats
              </p>
              <div className="mt-4 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
                <p className="text-sm font-semibold text-slate-100">Today&apos;s Summary</p>
                <div className="mt-2 space-y-1 text-sm text-slate-300">
                  <p>Average Stress: {stats ? `${Math.round(stats.averageStress)}%` : '—'}</p>
                  <p>
                    Highest:{' '}
                    {stats?.highestStress
                      ? `${Math.round(stats.highestStress.score)}% at ${stats.highestStress.time.toLocaleTimeString()}`
                      : '—'}
                  </p>
                  <p>
                    Lowest:{' '}
                    {stats?.lowestStress
                      ? `${Math.round(stats.lowestStress.score)}% at ${stats.lowestStress.time.toLocaleTimeString()}`
                      : '—'}
                  </p>
                  <p>
                    Total checks today: {todayCompleted}/{todayTotal || 0}{' '}
                    {todayTotal ? `(${Math.round((todayCompleted / todayTotal) * 100)}%)` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
                <p className="text-sm font-semibold text-slate-100">Recent Vital Signs (mock)</p>
                <div className="mt-2 space-y-1 text-sm text-slate-300">
                  <p>Heart Rate: {data.recentVitals.heartRate} bpm (Normal)</p>
                  <p>BP: {data.recentVitals.bloodPressure} mmHg (Normal)</p>
                  <p>Respiration: {data.recentVitals.respiration} breaths/min</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
                  <p className="text-xs font-semibold text-slate-200">❤️ Heart Rate</p>
                  {latestHeartRate ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold text-rose-300">
                        {latestHeartRate.bpm} <span className="text-xs text-slate-400">BPM</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Updated {new Date(latestHeartRate.timestamp).toLocaleTimeString()}
                      </p>
                      <div className="mt-2">
                        <HeartRateChart data={heartRateHistory} height={70} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No data yet</p>
                  )}
                </div>
                <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
                  <p className="text-xs font-semibold text-slate-200">😴 Fatigue</p>
                  {latestFatigue ? (
                    <>
                      <p
                        className="mt-2 text-2xl font-semibold"
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
                      <p className="mt-1 text-[11px] text-slate-500">
                        {latestFatigue.level === 'alert'
                          ? 'Alert'
                          : latestFatigue.level === 'mild_fatigue'
                          ? 'Mild fatigue'
                          : 'Significant fatigue'}
                        {latestBlinkRate ? ` · Blink ${latestBlinkRate.blinksPerMinute} BPM` : ''}
                      </p>
                      <div className="mt-2">
                        <BlinkRateChart data={blinkRateHistory} height={70} />
                      </div>
                      <div className="mt-2">
                        <FatigueTrendChart data={fatigueHistory} height={70} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No data yet</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-200">Adherence Rate</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-950 ring-1 ring-purple-800/25">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-[width] duration-300"
                    style={{ width: `${data.adherenceRate}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-300">{data.adherenceRate}%</p>
              </div>
            </section>

            <section className="rounded-2xl bg-slate-900/50 border border-purple-800/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
                ⏰ Next scheduled check
              </p>
              <div className="mt-4 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950 ring-1 ring-purple-800/25">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, 100 - (nextInMin / Math.max(1, data.patient.intervalMinutes)) * 100)).toFixed(0)}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-200">
                  Next check in: <span className="font-semibold">{nextInMin}</span> minutes
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Scheduled for: {new Date(data.nextScheduledCheck).toLocaleTimeString()}
                </p>
                <p className="mt-3 text-[12px] text-slate-400">
                  ℹ️ Checks run automatically based on the doctor&apos;s prescribed interval.
                </p>
              </div>
            </section>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-slate-900/50 border border-purple-800/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
            📈 Today&apos;s stress trend — {new Date().toLocaleDateString()}
          </p>
          <div className="mt-4">
            <StressHistoryChart data={todayRecords} height={240} color="purple" />
          </div>
          <p className="mt-4 text-sm text-slate-300">💡 Trend Analysis: {trendInsight}</p>
        </section>

        <section className="mt-6 rounded-2xl bg-slate-900/50 border border-purple-800/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
            🕐 Recent check-ins (last 10)
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="border-b border-purple-800/30 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Face</th>
                  <th className="px-3 py-2">Audio</th>
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
                      {r.status === 'missed' ? '—' : `${Math.round(r.faceConfidence * 100)}%`}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === 'missed' ? '—' : `${Math.round(r.audioConfidence * 100)}%`}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === 'missed' ? (
                        <span className="text-rose-200">❌</span>
                      ) : (
                        <span className="text-emerald-200">✅</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recent10.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={6}>
                      Waiting for first stress check.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-slate-900/50 border border-purple-800/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
            📅 Weekly summary (last 7 days)
          </p>

          <div className="mt-4 space-y-2 text-sm text-slate-200">
            {(weekly?.dailyAverages ?? []).map((d) => (
              <div key={d.day} className="flex items-center justify-between gap-3">
                <span className="w-10 text-slate-400">{d.day}:</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-950 ring-1 ring-purple-800/25">
                  <div
                    className={`h-full rounded-full ${
                      d.level === 'High'
                        ? 'bg-rose-500'
                        : d.level === 'Medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.round(d.score)}%` }}
                  />
                </div>
                <span className="w-32 text-right font-mono text-white">
                  {Math.round(d.score)}% ({d.level})
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
              <p className="text-xs text-slate-500">Weekly Average</p>
              <p className="mt-1 font-mono text-lg text-white">
                {weekly ? `${Math.round(weekly.weeklyAverage)}%` : '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
              <p className="text-xs text-slate-500">Trend</p>
              <p className="mt-1 font-mono text-lg text-white">
                {weekly ? `${weekly.trend >= 0 ? '+' : ''}${weekly.trend.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>

          {weekly?.latestNoteFromCareTeam && (
            <div className="mt-5 rounded-2xl bg-slate-950/40 p-4 ring-1 ring-purple-800/20">
              <p className="text-xs text-slate-500">📋 Notes from care team</p>
              <p className="mt-2 text-sm text-slate-200">{weekly.latestNoteFromCareTeam}</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.alert('Call: (555) 123-4567')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Phone className="h-4 w-4" />
              Call Hospital
            </button>
            <button
              type="button"
              onClick={() => window.alert('Mock message sent to nurse.')}
              className="min-h-[48px] rounded-full bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
            >
              Message Nurse (mock)
            </button>
          </div>
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

