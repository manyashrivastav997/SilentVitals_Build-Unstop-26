import { Area, AreaChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BlinkRateRecord } from '../../types/db'

export function BlinkRateChart({ data, height = 160 }: { data: BlinkRateRecord[]; height?: number }) {
  const chartData = data.slice(-48).map((record) => ({
    time: new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    bpm: record.blinksPerMinute,
    confidence: record.confidence,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="blinkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 40]} tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value: any, _name: any, props: any) =>
            props?.dataKey === 'bpm' ? [`${value} BPM`, 'Blink Rate'] : [value, '']
          }
          labelFormatter={(label) => `Time: ${label}`}
        />
        <ReferenceArea y1={25} y2={40} fill="#f59e0b" fillOpacity={0.1} />
        <ReferenceArea y1={0} y2={8} fill="#ef4444" fillOpacity={0.1} />
        <Area
          type="monotone"
          dataKey="bpm"
          stroke="#3b82f6"
          fill="url(#blinkGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

