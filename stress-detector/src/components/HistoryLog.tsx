import type { StressRecord } from '../hooks/useStressHistory'

const badge: Record<StressRecord['level'], string> = {
  Low: 'bg-emerald-600/30 text-emerald-200 ring-emerald-500/40',
  Medium: 'bg-amber-500/25 text-amber-100 ring-amber-500/40',
  High: 'bg-red-600/30 text-red-100 ring-red-500/40',
}

type HistoryLogProps = {
  records: StressRecord[]
}

export function HistoryLog({ records }: HistoryLogProps) {
  return (
    <details className="group rounded-xl border border-zinc-800 bg-zinc-900/40">
      <summary className="cursor-pointer list-none px-4 py-3 font-medium text-zinc-200 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex w-full items-center justify-between">
          History
          <span className="text-xs font-normal text-zinc-500">
            {records.length} saved (max 48)
          </span>
        </span>
      </summary>
      <ul className="max-h-56 space-y-2 overflow-y-auto border-t border-zinc-800 px-4 py-3 text-sm">
        {records.length === 0 && (
          <li className="text-zinc-500">No check-ins yet.</li>
        )}
        {records.map((r) => (
          <li
            key={r.timestamp}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-950/60 px-3 py-2 ring-1 ring-zinc-800/80"
          >
            <time className="font-mono text-xs text-zinc-400">
              {new Date(r.timestamp).toLocaleString()}
            </time>
            <span className="font-mono text-zinc-200">{r.score.toFixed(0)}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badge[r.level]}`}
            >
              {r.level}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
