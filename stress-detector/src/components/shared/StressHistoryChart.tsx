import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { StressRecord } from '../../types/db'

export interface StressHistoryChartProps {
  data: StressRecord[]
  height?: number
  color?: string // 'sky' | 'teal' etc
}

type Point = { t: number; timeLabel: string; score: number }

export function StressHistoryChart({
  data,
  height = 240,
  color = 'teal',
}: StressHistoryChartProps) {
  const points = useMemo<Point[]>(() => {
    return data
      .slice()
      .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
      .map((r) => {
        const t = +new Date(r.timestamp)
        const timeLabel = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        return { t, timeLabel, score: r.score }
      })
  }, [data])

  const stroke =
    color === 'sky'
      ? '#38bdf8'
      : color === 'emerald'
      ? '#22c55e'
      : color === 'purple'
      ? '#a855f7'
      : color === 'teal'
      ? '#14b8a6'
      : '#14b8a6'

  if (points.length === 0) {
    return <p className="text-sm text-slate-500">No recent stress records.</p>
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="svLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.85} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(51,65,85,0.35)" strokeDasharray="4 4" />
          <XAxis
            dataKey="timeLabel"
            tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(51,65,85,0.5)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'rgba(148,163,184,0.8)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(51,65,85,0.5)' }}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(2,6,23,0.95)',
              border: '1px solid rgba(15,118,110,0.35)',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: 'rgba(226,232,240,0.9)' }}
            formatter={(value) => [`${Number(value).toFixed(0)}%`, 'Stress']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="url(#svLine)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

