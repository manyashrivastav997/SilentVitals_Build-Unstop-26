import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FatigueRecord } from '../../types/db'

export function FatigueTrendChart({
  data,
  height = 80,
}: {
  data: FatigueRecord[]
  height?: number
}) {
  const chartData = data.slice(-24).map((record) => ({
    time: new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: record.score,
    level: record.level,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <XAxis dataKey="time" hide={height < 100} tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} hide={height < 100} />
        <Tooltip
          formatter={(value: any) => [`${value}/100`, 'Fatigue Score']}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <ReferenceLine y={33} stroke="#22c55e" strokeDasharray="3 3" />
        <ReferenceLine y={66} stroke="#f59e0b" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

