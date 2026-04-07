export interface StressGaugeProps {
  score: number
  size?: 'small' | 'large'
  showLabel?: boolean
  diameterPx?: number
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function scoreToColor(score: number) {
  if (score < 34) return { ring: 'from-emerald-400 to-emerald-600', text: 'text-emerald-200' }
  if (score <= 66) return { ring: 'from-amber-400 to-amber-600', text: 'text-amber-200' }
  return { ring: 'from-red-400 to-red-600', text: 'text-red-200' }
}

export function StressGauge({
  score,
  size = 'large',
  showLabel = true,
  diameterPx,
}: StressGaugeProps) {
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0
  const pct = clamp01(safeScore / 100)
  const { ring, text } = scoreToColor(safeScore)

  const dims = diameterPx ?? (size === 'small' ? 72 : 120)
  const inner = Math.round(dims * 0.76)

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: dims,
          height: dims,
          background: `conic-gradient(from 210deg, rgba(20,184,166,0.15) 0deg, rgba(20,184,166,0.15) 300deg, rgba(15,23,42,0.7) 300deg, rgba(15,23,42,0.7) 360deg)`,
        }}
        aria-label={`Stress score ${safeScore.toFixed(0)} out of 100`}
      >
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${ring}`}
          style={{
            maskImage: `conic-gradient(from 210deg, #000 ${pct * 300}turn, transparent 0)`,
            WebkitMaskImage: `conic-gradient(from 210deg, #000 ${pct * 300}turn, transparent 0)`,
            opacity: 0.85,
          }}
          aria-hidden
        />
        <div
          className="relative grid place-items-center rounded-full bg-slate-950 ring-1 ring-slate-800"
          style={{ width: inner, height: inner }}
        >
          <div className="text-center">
            <p className={`font-mono font-semibold tabular-nums ${text}`} style={{ fontSize: size === 'small' ? 18 : 26 }}>
              {safeScore.toFixed(0)}%
            </p>
            {showLabel && (
              <p className="mt-0.5 text-[10px] text-slate-500">
                {safeScore < 34 ? 'Low' : safeScore <= 66 ? 'Medium' : 'High'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

