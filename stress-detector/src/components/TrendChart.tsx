import type { StressRecord } from '../hooks/useStressHistory'

function segmentColor(score: number): string {
  if (score < 34) return '#34d399'
  if (score <= 66) return '#f59e0b'
  return '#ef4444'
}

type TrendChartProps = {
  records: StressRecord[]
}

export function TrendChart({ records }: TrendChartProps) {
  const w = 360
  const h = 120
  const pad = 12
  if (records.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-700 py-8 text-center text-sm text-zinc-500">
        No check-ins today yet.
      </p>
    )
  }

  const t0 = new Date(records[0]!.timestamp).getTime()
  const t1 = new Date(records[records.length - 1]!.timestamp).getTime()
  const span = Math.max(1, t1 - t0)

  const segments: { d: string; color: string }[] = []
  for (let i = 0; i < records.length - 1; i++) {
    const a = records[i]!
    const b = records[i + 1]!
    const ta = new Date(a.timestamp).getTime()
    const tb = new Date(b.timestamp).getTime()
    const xa = pad + ((ta - t0) / span) * (w - pad * 2)
    const xb = pad + ((tb - t0) / span) * (w - pad * 2)
    const ya = pad + (1 - a.score / 100) * (h - pad * 2)
    const yb = pad + (1 - b.score / 100) * (h - pad * 2)
    const mid = (a.score + b.score) / 2
    segments.push({
      d: `M ${xa.toFixed(1)} ${ya.toFixed(1)} L ${xb.toFixed(1)} ${yb.toFixed(1)}`,
      color: segmentColor(mid),
    })
  }

  const dots = records.map((r) => {
    const t = new Date(r.timestamp).getTime()
    const x = pad + ((t - t0) / span) * (w - pad * 2)
    const y = pad + (1 - r.score / 100) * (h - pad * 2)
    return { x, y, score: r.score }
  })

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full rounded-lg bg-zinc-900/90 ring-1 ring-zinc-700/80"
      role="img"
      aria-label="Today's stress trend"
    >
      <line
        x1={pad}
        y1={pad + (1 - 33 / 100) * (h - pad * 2)}
        x2={w - pad}
        y2={pad + (1 - 33 / 100) * (h - pad * 2)}
        stroke="currentColor"
        strokeDasharray="3 3"
        className="text-zinc-700"
      />
      <line
        x1={pad}
        y1={pad + (1 - 66 / 100) * (h - pad * 2)}
        x2={w - pad}
        y2={pad + (1 - 66 / 100) * (h - pad * 2)}
        stroke="currentColor"
        strokeDasharray="3 3"
        className="text-zinc-700"
      />
      {segments.map((s, i) => (
        <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" />
      ))}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={3.5} fill={segmentColor(d.score)} />
      ))}
    </svg>
  )
}
