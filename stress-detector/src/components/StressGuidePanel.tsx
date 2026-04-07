import type { StressLevel } from '../hooks/useStressAggregator'

type StressGuidePanelProps = {
  highlightLevel: StressLevel | null
}

const columns: {
  level: StressLevel
  title: string
  border: string
  muted: string
  body: string
  tips: string[]
}[] = [
  {
    level: 'low',
    title: 'Low stress',
    border: 'border-emerald-500/70 ring-emerald-500/30',
    muted: 'border-zinc-800 opacity-60',
    body: "You're calm and focused. Your body is in a relaxed state.",
    tips: ['Stay hydrated', 'Take short breaks', 'Keep up your routine'],
  },
  {
    level: 'medium',
    title: 'Medium stress',
    border: 'border-amber-500/70 ring-amber-500/30',
    muted: 'border-zinc-800 opacity-60',
    body: 'Mild tension detected. Your body is responding to demands.',
    tips: [
      'Take 5 deep breaths',
      'Stand up and stretch for 2 minutes',
      'Drink a glass of water',
      'Step outside briefly',
    ],
  },
  {
    level: 'high',
    title: 'High stress',
    border: 'border-red-500/70 ring-red-500/30',
    muted: 'border-zinc-800 opacity-60',
    body: 'Elevated stress detected. Your body needs relief.',
    tips: [
      'Stop for 5 minutes',
      'Box breathing: inhale 4s → hold 4s → exhale 4s → hold 4s',
      'Call someone you trust',
      'Take a short walk',
      'Avoid caffeine',
    ],
  },
]

export function StressGuidePanel({ highlightLevel }: StressGuidePanelProps) {
  return (
    <section className="mt-8 border-t border-zinc-800 pt-6">
      <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Stress level guide
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((c) => {
          const active = highlightLevel === c.level
          return (
            <div
              key={c.level}
              className={`rounded-xl border-2 p-4 transition ${
                active ? `${c.border} bg-zinc-900/80 ring-2` : `${c.muted}`
              }`}
            >
              <h3
                className={`mb-2 text-sm font-semibold ${
                  active ? 'text-white' : 'text-zinc-500'
                }`}
              >
                {c.title} —{' '}
                {c.level === 'low' ? 'green' : c.level === 'medium' ? 'amber' : 'red'}
              </h3>
              <p className="mb-3 text-sm leading-relaxed text-zinc-400">{c.body}</p>
              <p className="mb-1 text-xs font-medium uppercase text-zinc-600">Tips</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-zinc-500">
                {c.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
