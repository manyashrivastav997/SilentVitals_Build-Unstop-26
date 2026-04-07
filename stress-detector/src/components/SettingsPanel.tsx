import { useState } from 'react'

type SettingsPanelProps = {
  intervalMinutes: number
  onIntervalChange: (min: number) => void
  onClearData: () => void
}

export function SettingsPanel({
  intervalMinutes,
  onIntervalChange,
  onClearData,
}: SettingsPanelProps) {
  const [custom, setCustom] = useState(String(intervalMinutes))
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <details className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-200 marker:content-none [&::-webkit-details-marker]:hidden">
        Settings
      </summary>
      <div className="space-y-4 border-t border-zinc-800 px-4 py-4 text-sm">
        <div>
          <p className="mb-2 font-medium text-zinc-300">Reminder interval</p>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 120].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onIntervalChange(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                  intervalMinutes === m
                    ? 'bg-emerald-950/60 text-emerald-200 ring-emerald-500/50'
                    : 'bg-zinc-800 text-zinc-400 ring-zinc-600 hover:bg-zinc-700'
                }`}
              >
                {m === 30 ? '30 min' : m === 60 ? '1 hour' : '2 hours'}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="custom-min" className="text-zinc-500">
              Custom (minutes)
            </label>
            <input
              id="custom-min"
              type="number"
              min={5}
              max={24 * 60}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-zinc-200"
            />
            <button
              type="button"
              onClick={() => {
                const n = parseInt(custom, 10)
                if (Number.isFinite(n) && n >= 5) onIntervalChange(n)
              }}
              className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-white hover:bg-zinc-600"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-sm text-red-200 hover:bg-red-950/60"
            >
              Clear all data
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-200">Erase all history from this device?</span>
              <button
                type="button"
                onClick={() => {
                  onClearData()
                  setConfirmClear(false)
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white"
              >
                Yes, clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </details>
  )
}
