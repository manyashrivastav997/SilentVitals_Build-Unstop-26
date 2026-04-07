import type { StressLevel } from '../hooks/useStressAggregator'

export type ScorePoint = { t: number; score: number }

const levelStyles: Record<
  StressLevel,
  { label: string; badge: string; bar: string; ring: string }
> = {
  low: {
    label: 'Low',
    badge: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40',
    bar: 'bg-emerald-500',
    ring: 'ring-emerald-500/40',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-900/40',
    bar: 'bg-amber-500',
    ring: 'ring-amber-500/40',
  },
  high: {
    label: 'High',
    badge: 'bg-red-600 text-white shadow-lg shadow-red-900/40',
    bar: 'bg-red-500',
    ring: 'ring-red-500/40',
  },
}

type StressDisplayProps = {
  score: number
  level: StressLevel
  chartPoints: ScorePoint[]
  chartWindowEnd: number
  lowConfidence: boolean
  phase: 'idle' | 'running' | 'complete'
  sessionResult: { score: number; level: StressLevel; lowConfidence: boolean } | null
}

export function StressDisplay({
  score,
  level,
  chartPoints,
  chartWindowEnd,
  lowConfidence,
  phase,
  sessionResult,
}: StressDisplayProps) {
  const s = levelStyles[level]
  const w = 320
  const h = 100
  const pad = 8

  const windowStart = chartWindowEnd - 30_000
  const pts = chartPoints.filter((p) => p.t >= windowStart)
  const span = 30_000
  let pathD = ''
  if (pts.length >= 1) {
    const coords = pts.map((p, i) => {
      const x = pad + ((p.t - windowStart) / span) * (w - pad * 2)
      const y = pad + (1 - p.score / 100) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    pathD = coords.join(' ')
  }

  const showFinal = phase === 'complete' && sessionResult

  return (
    <div className="flex w-full flex-col gap-5">
      {lowConfidence && (phase === 'running' || showFinal) && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-950/50 px-3 py-2 text-center text-xs font-medium text-amber-200">
          Low confidence — fewer than 3 of 5 face samples succeeded
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          {showFinal ? 'Check-in result' : 'Stress level'}
        </p>
        <div
          className={`inline-flex min-w-[12rem] items-center justify-center rounded-2xl px-10 py-5 text-3xl font-semibold tracking-tight ring-4 ${s.badge} ${s.ring}`}
        >
          {s.label}
        </div>
        <p className="text-sm text-zinc-400">
          Score{' '}
          <span className="font-mono text-zinc-100">
            {(showFinal ? sessionResult!.score : score).toFixed(0)}
          </span>{' '}
          / 100
        </p>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>0</span>
          <span>Stress gauge</span>
          <span>100</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${s.bar}`}
            style={{
              width: `${Math.min(100, Math.max(0, showFinal ? sessionResult!.score : score))}%`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
          <span>Low 0–33</span>
          <span>Med 34–66</span>
          <span>High 67–100</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">Session chart (last 30s)</p>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full rounded-lg bg-zinc-900/90 ring-1 ring-zinc-700/80"
          role="img"
          aria-label="Stress score over the last 30 seconds"
        >
          <line
            x1={pad}
            y1={pad + (1 - 33 / 100) * (h - pad * 2)}
            x2={w - pad}
            y2={pad + (1 - 33 / 100) * (h - pad * 2)}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-zinc-700"
          />
          <line
            x1={pad}
            y1={pad + (1 - 66 / 100) * (h - pad * 2)}
            x2={w - pad}
            y2={pad + (1 - 66 / 100) * (h - pad * 2)}
            stroke="currentColor"
            strokeDasharray="4 4"
            className="text-zinc-700"
          />
          {pathD && (
            <path d={pathD} fill="none" stroke="url(#stressGrad)" strokeWidth="2" strokeLinejoin="round" />
          )}
          <defs>
            <linearGradient id="stressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}
