import { useEffect, useState } from 'react'
import { ArrowLeft, Clock, FileText, User, Activity } from 'lucide-react'
import {
  addClinicalNote,
  getBlinkRateHistory,
  getFatigueHistory,
  getHeartRateHistory,
  getLatestBlinkRate,
  getLatestFatigue,
  getLatestHeartRate,
  getClinicalNotes,
  getIntervalSettingsForPatient,
  getPatientFullDetails,
  updatePatientInterval,
} from '../db/indexedDb'
import type { ClinicalNote } from '../types/db'
import type { PatientDetails } from '../db/indexedDb'
import type { BlinkRateRecord, FatigueRecord, HeartRateRecord } from '../types/db'
import { HeartRateChart } from './shared/HeartRateChart'
import { BlinkRateChart } from './shared/BlinkRateChart'
import ManualHeartRateEntry from './ManualHeartRateEntry'
import { FatigueTrendChart } from './shared/FatigueTrendChart'

type Props = {
  patientId: string
  onBack: () => void
}

export function DoctorPatientDetail({ patientId, onBack }: Props) {
  const [details, setDetails] = useState<PatientDetails | null>(null)
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [intervalMinutes, setIntervalMinutes] = useState(30)
  const [reason, setReason] = useState('')
  const [savingInterval, setSavingInterval] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [lastModified, setLastModified] = useState<Date | null>(null)

  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateRecord[]>([])
  const [latestHeartRate, setLatestHeartRate] = useState<HeartRateRecord | null>(null)
  const [blinkRateHistory, setBlinkRateHistory] = useState<BlinkRateRecord[]>([])
  const [latestBlinkRate, setLatestBlinkRate] = useState<BlinkRateRecord | null>(null)
  const [fatigueHistory, setFatigueHistory] = useState<FatigueRecord[]>([])
  const [latestFatigue, setLatestFatigue] = useState<FatigueRecord | null>(null)
  const [showHrModal, setShowHrModal] = useState(false)

  useEffect(() => {
    void (async () => {
      const d = await getPatientFullDetails(patientId, 1)
      setDetails(d)
      setIntervalMinutes(d.intervalMinutes)
      setNotes(d.notes)
      const s = await getIntervalSettingsForPatient(patientId)
      if (s) setLastModified(s.lastModifiedAt)

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
    })()
  }, [patientId])

  const refreshVitals = async () => {
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
  }

  const latest = details?.records[0]

  const handleSaveInterval = async () => {
    if (!details) return
    setSavingInterval(true)
    try {
      await updatePatientInterval(patientId, intervalMinutes, reason, 'doctor-1')
      const s = await getIntervalSettingsForPatient(patientId)
      if (s) setLastModified(s.lastModifiedAt)
    } finally {
      setSavingInterval(false)
    }
  }

  const handleSaveNote = async () => {
    if (!details || !newNote.trim()) return
    setSavingNote(true)
    try {
      const note: ClinicalNote = {
        id: `note-${patientId}-${Date.now()}`,
        patientId,
        authorId: 'doctor-1',
        authorName: 'Dr. Sarah Wilson',
        role: 'doctor',
        text: newNote.trim(),
        createdAt: new Date(),
      }
      await addClinicalNote(note)
      const updated = await getClinicalNotes(patientId)
      setNotes(updated)
      setNewNote('')
    } finally {
      setSavingNote(false)
    }
  }

  if (!details) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-200">
        Loading patient…
      </div>
    )
  }

  const last5 = details.records.slice(0, 5)
  const last20 = details.records.slice(0, 20)

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black px-4 pb-10 pt-4 text-slate-50 sm:px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl bg-slate-950/90 px-4 py-3 ring-1 ring-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to patients
        </button>
        <div className="text-right">
          <p className="text-sm font-semibold text-white">
            {details.name} – Room {details.roomNumber}, Bed {details.bedNumber}
          </p>
          <p className="text-[11px] text-slate-400">{details.diagnosis}</p>
        </div>
      </header>

      <main className="mx-auto mt-5 flex max-w-6xl flex-col gap-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <User className="h-4 w-4 text-sky-400" />
                Demographics
              </h2>
              <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <dt className="text-slate-500">Age</dt>
                  <dd>{details.age}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Admission date</dt>
                  <dd>{new Date(details.admissionDate).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Severity</dt>
                  <dd className="capitalize">{details.severity}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Interval</dt>
                  <dd>Every {details.intervalMinutes} min</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Clock className="h-4 w-4 text-emerald-400" />
                Care team
              </h2>
              <ul className="space-y-1 text-xs text-slate-300">
                <li>👨‍⚕️ Doctor: {details.doctorName}</li>
                <li>👩‍⚕️ Nurse: {details.nurseName}</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">Check-up interval</h2>
              <p className="mb-1 text-xs text-slate-400">
                Current: every <span className="font-mono">{intervalMinutes}</span> minutes
              </p>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                className="mt-1 w-full accent-sky-500"
              />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for change (optional)"
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
              />
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveInterval}
                  disabled={savingInterval}
                  className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {savingInterval ? 'Saving…' : 'Save interval'}
                </button>
                {lastModified && (
                  <p className="text-[10px] text-slate-500">
                    Last changed {new Date(lastModified).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Activity className="h-4 w-4 text-emerald-400" />
                Current stress
              </h2>
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-slate-700" />
                  <div
                    className="absolute inset-1 rounded-full bg-gradient-to-br from-slate-900 to-slate-950"
                    aria-hidden
                  />
                  <p className="relative z-10 text-2xl font-semibold text-white">
                    {latest ? `${latest.score.toFixed(0)}%` : '—'}
                  </p>
                </div>
                <div className="flex-1 text-xs text-slate-300">
                  <p>
                    Level:{' '}
                    <span className="font-semibold">
                      {latest ? latest.level : 'No recent data'}
                    </span>
                  </p>
                  <p className="mt-1 text-slate-400">
                    {latest
                      ? `Last reading at ${new Date(latest.timestamp).toLocaleTimeString()}`
                      : 'No readings in the last 24 hours.'}
                  </p>
                </div>
              </div>

              {last5.length > 0 && (
                <ul className="mt-3 space-y-1 text-[11px] text-slate-300">
                  {last5.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
                      <span className="font-mono">{r.score.toFixed(0)}%</span>
                      <span>{r.level}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
              <h2 className="mb-2 text-sm font-semibold text-slate-100">
                24‑hour stress trend
              </h2>
              <TrendSpark records={details.records} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">❤️ Heart Rate</h3>
              <button
                type="button"
                onClick={() => setShowHrModal(true)}
                className="text-xs font-semibold text-sky-300 hover:text-sky-200"
              >
                + Add Reading
              </button>
            </div>
            {latestHeartRate ? (
              <>
                <p className="text-3xl font-semibold text-rose-300">
                  {latestHeartRate.bpm}{' '}
                  <span className="text-sm font-normal text-slate-400">BPM</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Measured {new Date(latestHeartRate.timestamp).toLocaleString()}
                  {latestHeartRate.context ? ` (${latestHeartRate.context})` : ''}
                </p>
                <div className="mt-3">
                  <HeartRateChart data={heartRateHistory} height={90} />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Normal range: 60–100 BPM</p>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No heart rate data yet</p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">😴 Fatigue</h3>
              <span className="text-[11px] text-slate-500">Real-time monitoring</span>
            </div>

            {latestFatigue ? (
              <>
                <div className="flex items-end justify-between gap-3">
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
                      ? '🟢 ALERT'
                      : latestFatigue.level === 'mild_fatigue'
                      ? '🟡 MILD'
                      : '🔴 SIGNIFICANT'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-300">{latestFatigue.recommendation}</p>
                <div className="mt-3">
                  <FatigueTrendChart data={fatigueHistory} height={90} />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Blink: {latestFatigue.contributingFactors.blinkRate} BPM · Stress:{' '}
                  {latestFatigue.contributingFactors.stressLevel}% · Session:{' '}
                  {latestFatigue.contributingFactors.sessionDuration ?? 0} min
                </p>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">
                Collecting blink rate data…
              </p>
            )}

            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
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
        </section>

        <section className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">
            Stress records (last 20)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[11px] text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Time</th>
                  <th className="px-2 py-1.5">Score</th>
                  <th className="px-2 py-1.5">Level</th>
                  <th className="px-2 py-1.5">Face conf.</th>
                  <th className="px-2 py-1.5">Audio conf.</th>
                </tr>
              </thead>
              <tbody>
                {last20.map((r) => (
                  <tr key={r.id} className="border-b border-slate-900/80">
                    <td className="px-2 py-1.5">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{r.score.toFixed(0)}%</td>
                    <td className="px-2 py-1.5">{r.level}</td>
                    <td className="px-2 py-1.5">{Math.round(r.faceConfidence * 100)}%</td>
                    <td className="px-2 py-1.5">
                      {Math.round(r.audioConfidence * 100)}%
                    </td>
                  </tr>
                ))}
                {last20.length === 0 && (
                  <tr>
                    <td className="px-2 py-2 text-slate-500" colSpan={5}>
                      No records available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-950/90 p-4 ring-1 ring-slate-800">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <FileText className="h-4 w-4 text-sky-400" />
            Clinical notes
          </h2>
          <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
            <div>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this patient…"
                className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
              />
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="mt-2 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
            <div className="max-h-40 space-y-2 overflow-y-auto text-xs text-slate-300">
              {notes.length === 0 && (
                <p className="text-slate-500">No notes yet for this patient.</p>
              )}
              {notes
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
                .map((n) => (
                  <article
                    key={n.id}
                    className="rounded-lg bg-slate-900/80 px-3 py-2 ring-1 ring-slate-800/80"
                  >
                    <p className="text-[11px] font-semibold text-slate-100">
                      {n.authorName} · {n.role}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs">{n.text}</p>
                  </article>
                ))}
            </div>
          </div>
        </section>
      </main>

      {showHrModal && (
        <ManualHeartRateEntry
          patientId={patientId}
          onSave={() => void refreshVitals()}
          onClose={() => setShowHrModal(false)}
        />
      )}
    </div>
  )
}

function TrendSpark({ records }: { records: PatientDetails['records'] }) {
  if (records.length === 0) {
    return <p className="text-xs text-slate-500">No data for the last 24 hours.</p>
  }
  const width = 320
  const height = 80
  const times = records
    .slice()
    .map((r) => new Date(r.timestamp).getTime())
    .sort((a, b) => a - b)
  const minT = times[0]!
  const maxT = times[times.length - 1]!
  const span = maxT - minT || 1
  const minScore = 0
  const maxScore = 100

  const points = records
    .slice()
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    .map((r, i) => {
      const t = new Date(r.timestamp).getTime()
      const x = 10 + ((t - minT) / span) * (width - 20)
      const y =
        height - 10 - ((r.score - minScore) / (maxScore - minScore)) * (height - 20)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full rounded-lg bg-slate-950/80 ring-1 ring-slate-800"
    >
      <path d={points} fill="none" stroke="#38bdf8" strokeWidth={2} />
    </svg>
  )
}

