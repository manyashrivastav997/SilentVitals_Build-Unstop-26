import { useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HeartRateRecord } from '../../types/db'

export function HeartRateChart({
  data,
  height = 100,
  color = '#f43f5e',
}: {
  data: HeartRateRecord[]
  height?: number
  color?: string
}) {
  const chartData = useMemo(() => {
    return data
      .slice()
      .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
      .map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bpm: r.bpm,
      }))
  }, [data])

  if (chartData.length === 0) {
    return <p className="text-sm text-slate-500">No heart rate data yet.</p>
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="time" hide={height < 80} tick={{ fontSize: 10, fill: 'rgba(148,163,184,0.8)' }} />
          <YAxis domain={[40, 140]} hide={height < 80} tick={{ fontSize: 10, fill: 'rgba(148,163,184,0.8)' }} />
          <Tooltip
            contentStyle={{
              background: 'rgba(2,6,23,0.95)',
              border: '1px solid rgba(244,63,94,0.35)',
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(value) => [`${value} BPM`, 'Heart Rate']}
          />
          <Line type="monotone" dataKey="bpm" stroke={color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

