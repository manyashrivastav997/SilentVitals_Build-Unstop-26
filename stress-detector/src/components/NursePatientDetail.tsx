import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { useUser } from '../contexts/UserContext'
import {
  getBlinkRateHistory,
  getFatigueHistory,
  getHeartRateHistory,
  getLatestBlinkRate,
  getLatestFatigue,
  getLatestHeartRate,
  getPatientDetailsForNurse,
} from '../db/indexedDb'
import type {
  BlinkRateRecord,
  FatigueRecord,
  HeartRateRecord,
  IntervalSettings,
  Patient,
  StressRecord,
} from '../types/db'
import { NotesSection } from './shared/NotesSection'
import { StressGauge } from './shared/StressGauge'
import { StressHistoryChart } from './shared/StressHistoryChart'
import { StressRecordsTable } from './shared/StressRecordsTable'
import { HeartRateChart } from './shared/HeartRateChart'
import { BlinkRateChart } from './shared/BlinkRateChart'
import { FatigueTrendChart } from './shared/FatigueTrendChart'

export interface NursePatientDetailProps {
  patientId: string
  onBack: () => void
}

function levelForScore(score: number | null) {
  if (score == null) return { label: 'No data', cls: 'bg-slate-700/40 text-slate-200' }
  if (score < 34) return { label: 'Low', cls: 'bg-emerald-500/15 text-emerald-200' }
  if (score <= 66) return { label: 'Medium', cls: 'bg-amber-500/15 text-amber-200' }
  return { label: 'High', cls: 'bg-red-500/15 text-red-200' }
}

function severityBadge(sev: string) {
  if (sev === 'low') return { dot: 'bg-emerald-400', text: 'text-emerald-200' }
  if (sev === 'medium') return { dot: 'bg-amber-400', text: 'text-amber-200' }
  return { dot: 'bg-red-500', text: 'text-red-200' }
}

function nextCheckLabel(lastCheckIn: Date, intervalMinutes: number) {
  const nextDue = new Date(new Date(lastCheckIn).getTime() + intervalMinutes * 60000)
  const diffMin = Math.round((nextDue.getTime() - Date.now()) / 60000)
  if (diffMin >= 0) return `In ${diffMin} minutes`
  return `${Math.abs(diffMin)} minutes overdue`
}

function mockAllergies(patientId: string) {
  const opts = ['Penicillin', 'Latex', 'None', 'Shellfish', 'NSAIDs']
  const idx = Math.abs(
    patientId.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
  )
  const pick = opts[idx % opts.length]!
  return pick === 'None' ? ['None'] : [pick]
}

function mockGender(patientId: string) {
  const v = patientId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 3
  return v === 0 ? 'Female' : v === 1 ? 'Male' : 'Other'
}

export default function NursePatientDetail({ patientId, onBack }: NursePatientDetailProps) {
  const { currentUser } = useUser()
  const nurseId = currentUser?.role === 'nurse' ? currentUser.id : 'nurse-1'
  const nurseName = currentUser?.role === 'nurse' ? currentUser.name : 'Nurse Jennifer Lee'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [stressRecords, setStressRecords] = useState<StressRecord[]>([])
  const [intervalSettings, setIntervalSettings] = useState<IntervalSettings[]>([])
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateRecord[]>([])
  const [latestHeartRate, setLatestHeartRate] = useState<HeartRateRecord | null>(null)
  const [blinkRateHistory, setBlinkRateHistory] = useState<BlinkRateRecord[]>([])
  const [latestBlinkRate, setLatestBlinkRate] = useState<BlinkRateRecord | null>(null)
  const [fatigueHistory, setFatigueHistory] = useState<FatigueRecord[]>([])
  const [latestFatigue, setLatestFatigue] = useState<FatigueRecord | null>(null)

  const refresh = async () => {
    setError(null)
    try {
      const d = await getPatientDetailsForNurse(patientId, 7)
      setPatient(d.patient)
      setStressRecords(d.stressRecords)
      setIntervalSettings(d.intervalSettings)
      const [hrHist, hrLatest, blinkHist, blinkLatest, fatHist, fatLatest] = await Promise.all([
        getHeartRateHistory(patientId, 7),
        getLatestHeartRate(patientId),
        getBlinkRateHistory(patientId, 24 * 60),
        getLatestBlinkRate(patientId),
        getFatigueHistory(patientId, 24),
        getLatestFatigue(patientId),
      ])
      setHeartRateHistory(hrHist)
      setLatestHeartRate(hrLatest)
      setBlinkRateHistory(blinkHist)
      setLatestBlinkRate(blinkLatest)
      setFatigueHistory(fatHist)
      setLatestFatigue(fatLatest)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load patient')
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 30_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  const latest = stressRecords
    .slice()
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]
  const previous = stressRecords
    .slice()
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[1]

  const latestScore = latest?.score ?? null
  const previousScore = previous?.score ?? null
  const trend =
    latestScore == null || previousScore == null
      ? '→'
      : latestScore > previousScore + 2
      ? '↑'
      : latestScore < previousScore - 2
      ? '↓'
      : '→'

  const latestLevel = levelForScore(latestScore)
  const sev = severityBadge(patient?.severity ?? 'medium')

  const last5 = useMemo(() => {
    return stressRecords
      .slice()
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 5)
  }, [stressRecords])

  const last20 = useMemo(() => {
    return stressRecords
      .slice()
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 20)
  }, [stressRecords])

  const last24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000
    return stressRecords.filter((r) => +new Date(r.timestamp) >= since)
  }, [stressRecords])

  const interval = intervalSettings[0] ?? null

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        Loading patient…
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        Patient not found.
      </div>
    )
  }

  const gender = mockGender(patient.id)
  const allergies = mockAllergies(patient.id)

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black px-4 pb-10 pt-4 text-slate-50 sm:px-6">
      <header className="sticky top-0 z-10 mx-auto flex max-w-6xl flex-col gap-3 rounded-xl bg-teal-950/95 px-4 py-3 ring-1 ring-teal-800 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] rounded-full bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-600"
          >
            ← Back to Patient List
          </button>
          <div>
            <p className="text-lg font-semibold text-white">{patient.name}</p>
            <p className="text-xs text-teal-100/80">
              Room {patient.roomNumber} · Bed {patient.bedNumber} | Admitted:{' '}
              {new Date(patient.admissionDate).toLocaleDateString()}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${latestLevel.cls}`}>
                Stress: {latestLevel.label}
                {latestScore != null ? ` · ${latestScore.toFixed(0)}%` : ''}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/50 px-2 py-0.5 text-[10px] text-slate-200 ring-1 ring-teal-800/30">
                <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                <span className={`capitalize ${sev.text}`}>{patient.severity}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/50 px-2 py-0.5 text-[10px] text-slate-200 ring-1 ring-teal-800/30">
                <Lock className="h-3 w-3 text-teal-200" />
                Viewing as Nurse - Read Only
              </span>
            </div>
          </div>
        </div>

        {error && (
          <button
            type="button"
            onClick={() => void refresh()}
            className="min-h-[44px] rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            Retry
          </button>
        )}
      </header>

      <main className="mx-auto mt-5 flex max-w-6xl flex-col gap-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-100">Demographics</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div>
                  <dt className="text-slate-500">Age</dt>
                  <dd>{patient.age}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Gender</dt>
                  <dd>{gender}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Admission Date</dt>
                  <dd>{new Date(patient.admissionDate).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Primary Diagnosis</dt>
                  <dd>{patient.diagnosis}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Allergies</dt>
                  <dd>{allergies.join(', ')}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-100">Care Team</h2>
              <div className="mt-3 space-y-3 text-sm">
                <div className="rounded-xl bg-slate-950/50 p-3 ring-1 ring-teal-800/25">
                  <p className="text-[11px] font-semibold text-slate-200">👨‍⚕️ Attending Doctor</p>
                  <p className="mt-1 text-sm text-white">{patient.doctorName}</p>
                  <p className="text-xs text-slate-400">(555) 123-4567</p>
                </div>
                <div className="rounded-xl bg-slate-950/50 p-3 ring-1 ring-teal-800/25">
                  <p className="text-[11px] font-semibold text-slate-200">👩‍⚕️ Primary Nurse</p>
                  <p className="mt-1 text-sm text-white">
                    {patient.nurseName}
                    {patient.assignedNurseId === nurseId ? ' (You)' : ''}
                  </p>
                  <p className="text-xs text-slate-400">(555) 123-4568</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-gray-700 opacity-80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">⏰ Check-up Interval</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/60 px-2 py-0.5 text-[10px] text-slate-200">
                  <Lock className="h-3 w-3" />
                  Read-only
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-slate-950/40 px-4 py-3 ring-1 ring-slate-700/60">
                <p className="text-sm text-slate-200">
                  Every <span className="font-mono text-white">{patient.intervalMinutes}</span> minutes
                </p>
              </div>

              <div className="mt-3 text-xs text-slate-300 space-y-1">
                <p className="text-slate-400">
                  Last changed:{' '}
                  {interval ? new Date(interval.lastModifiedAt).toLocaleString() : '—'}
                </p>
                <p className="text-slate-400">
                  By: {interval ? patient.doctorName : '—'}
                </p>
                <p className="text-slate-400">
                  Reason: {interval?.reasonForChange ? `"${interval.reasonForChange}"` : '—'}
                </p>
                <p className="mt-2 text-slate-200">
                  Next check: {nextCheckLabel(patient.lastCheckIn, patient.intervalMinutes)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">Current Stress</h2>
                <span className="text-xs text-slate-400">
                  Trend: <span className="font-semibold text-teal-200">{trend}</span>
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <StressGauge score={latestScore ?? 0} size="large" />
                <div className="text-sm text-slate-300">
                  <p>
                    Level:{' '}
                    <span className="font-semibold text-white">{latestLevel.label}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {latest
                      ? `Last reading at ${new Date(latest.timestamp).toLocaleTimeString()}`
                      : 'No readings in the selected period.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-100">Last 5 Readings</h2>
              {last5.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No recent stress records.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-xs">
                  {last5.map((r) => {
                    const b = levelForScore(r.score)
                    return (
                      <li
                        key={r.id}
                        className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2 ring-1 ring-teal-800/20"
                      >
                        <span className="text-slate-300">
                          {new Date(r.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-mono text-white">{r.score.toFixed(0)}%</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${b.cls}`}>
                          {r.level}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-100">24‑Hour Stress Chart</h2>
              <div className="mt-3">
                <StressHistoryChart data={last24h} height={220} color="teal" />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-100">❤️ Heart Rate</h2>
              {latestHeartRate ? (
                <>
                  <p className="mt-2 text-3xl font-semibold text-rose-300">
                    {latestHeartRate.bpm}{' '}
                    <span className="text-sm font-normal text-slate-400">BPM</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Updated {new Date(latestHeartRate.timestamp).toLocaleString()}
                  </p>
                  <div className="mt-3">
                    <HeartRateChart data={heartRateHistory} height={90} />
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No data yet</p>
              )}
            </div>

            <div className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-100">😴 Fatigue</h2>
              {latestFatigue ? (
                <>
                  <div className="mt-2 flex items-end justify-between gap-3">
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
                      {latestFatigue.score}
                      <span className="text-sm font-normal text-slate-400">/100</span>
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                        latestFatigue.level === 'alert'
                          ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/20'
                          : latestFatigue.level === 'mild_fatigue'
                          ? 'bg-amber-500/15 text-amber-200 ring-amber-500/20'
                          : 'bg-rose-500/15 text-rose-200 ring-rose-500/20'
                      }`}
                    >
                      {latestFatigue.level === 'alert'
                        ? 'ALERT'
                        : latestFatigue.level === 'mild_fatigue'
                        ? 'MILD'
                        : 'SIGNIFICANT'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{latestFatigue.recommendation}</p>
                  <div className="mt-3">
                    <FatigueTrendChart data={fatigueHistory} height={90} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Blink: {latestFatigue.contributingFactors.blinkRate} BPM · Stress:{' '}
                    {latestFatigue.contributingFactors.stressLevel}%
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No data yet</p>
              )}

              <div className="mt-4 rounded-xl border border-teal-800/30 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-200">👁️ Blink rate</p>
                  <p className="text-xs text-slate-400">
                    {latestBlinkRate ? `${latestBlinkRate.blinksPerMinute} BPM` : '—'}
                  </p>
                </div>
                <div className="mt-2">
                  <BlinkRateChart data={blinkRateHistory} height={80} />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Normal: 10–20 · Fatigue: &gt;25 · Strain: &lt;8
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/50 border border-teal-800/30 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-100">Stress Records (last 20)</h2>
          <div className="mt-3">
            <StressRecordsTable records={last20} maxRows={20} />
          </div>
        </section>

        <NotesSection
          patientId={patientId}
          canAddNotes
          currentUserId={nurseId}
          currentUserName={nurseName}
          currentUserRole="nurse"
        />
      </main>
    </div>
  )
}

