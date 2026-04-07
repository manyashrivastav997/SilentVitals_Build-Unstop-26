import { useMemo } from 'react'
import type { PatientWithLatestStress } from '../../db/indexedDb'

export interface PatientCardProps {
  patient: PatientWithLatestStress
  variant: 'doctor' | 'nurse'
  onViewDetails: () => void
  onAdjustInterval?: () => void
}

function levelBadge(score: number | null, level: string | null) {
  const l = level ?? (score == null ? null : score < 34 ? 'Low' : score <= 66 ? 'Medium' : 'High')
  const cls =
    l === 'Low'
      ? 'bg-emerald-500/20 text-emerald-200'
      : l === 'Medium'
      ? 'bg-amber-500/20 text-amber-200'
      : l === 'High'
      ? 'bg-red-500/20 text-red-200'
      : 'bg-slate-700/40 text-slate-300'
  return { label: l ?? 'No data', cls }
}

function severityDot(sev: string) {
  return sev === 'low' ? 'bg-emerald-400' : sev === 'medium' ? 'bg-amber-400' : 'bg-red-500'
}

export function PatientCard({
  patient,
  variant,
  onViewDetails,
  onAdjustInterval,
}: PatientCardProps) {
  const latest = patient.latestRecord
  const score = latest?.score ?? null
  const level = latest?.level ?? null
  const badge = useMemo(() => levelBadge(score, level), [score, level])
  const hr = patient.latestHeartRate?.bpm ?? null
  const blink = patient.latestBlinkRate?.blinksPerMinute ?? null

  const lastCheckMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(patient.lastCheckIn).getTime()) / 60000),
  )
  const nextCheckMs =
    new Date(patient.lastCheckIn).getTime() + patient.intervalMinutes * 60000
  const nextInMinutes = Math.max(0, Math.round((nextCheckMs - Date.now()) / 60000))

  const cardBase =
    variant === 'nurse'
      ? 'bg-slate-900/50 rounded-xl border border-teal-800/30 hover:border-teal-500 hover:shadow-xl hover:scale-[1.02] transition-all'
      : 'rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-md transition-transform hover:scale-[1.02] hover:border-sky-500/70 hover:shadow-2xl'

  const padding = variant === 'nurse' ? 'p-4' : ''

  return (
    <div className={`${cardBase} ${padding} flex flex-col`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{patient.name}</p>
          <p className="text-xs text-slate-400">
            Room {patient.roomNumber} · Bed {patient.bedNumber}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
          {badge.label}
          {score != null ? ` · ${score.toFixed(0)}%` : ''}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${severityDot(patient.severity)}`} />
            <span className="capitalize">{patient.severity} severity</span>
          </div>
          <span className="text-slate-400">
            Attending: {patient.doctorName}
          </span>
        </div>

        <div className="text-xs text-slate-400">
          <p>Last check: {lastCheckMinutes} min ago</p>
          <p>Next check: in {nextInMinutes} min</p>
        </div>

        <div className="border-t border-slate-800/60 pt-2 text-xs text-slate-300">
          <p className="hidden sm:block">HR: 72 | BP: 118/76</p>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-800/60 pt-3 text-center">
          <div>
            <div className="text-[10px] uppercase text-slate-500">Stress</div>
            <div
              className={`text-sm font-bold ${
                score != null && score > 66
                  ? 'text-red-300'
                  : score != null && score > 33
                  ? 'text-amber-300'
                  : 'text-emerald-300'
              }`}
            >
              {score != null ? `${Math.round(score)}%` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500">Heart</div>
            <div className="text-sm font-bold text-rose-300">
              {hr != null ? `${hr} BPM` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-500">Blink</div>
            <div
              className={`text-sm font-bold ${
                blink != null && blink > 25
                  ? 'text-amber-300'
                  : blink != null && blink < 8
                  ? 'text-orange-300'
                  : 'text-blue-300'
              }`}
            >
              {blink != null ? `${blink} BPM` : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onViewDetails}
          className={`min-h-[44px] rounded-full px-4 py-2 text-[12px] font-semibold ${
            variant === 'nurse'
              ? 'bg-teal-600 hover:bg-teal-700 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
          }`}
        >
          📊 View Details
        </button>
        {variant === 'doctor' && (
          <button
            type="button"
            onClick={onAdjustInterval ?? onViewDetails}
            className="min-h-[44px] rounded-full bg-sky-600 px-4 py-2 text-[12px] font-semibold text-white hover:bg-sky-500"
          >
            ⚙️ Adjust Interval
          </button>
        )}
      </div>
    </div>
  )
}

