import { useState } from 'react'
import { saveHeartRateRecord } from '../db/indexedDb'

export default function ManualHeartRateEntry({
  patientId,
  onSave,
  onClose,
}: {
  patientId: string
  onSave: () => void
  onClose: () => void
}) {
  const [bpm, setBpm] = useState('')
  const [context, setContext] = useState<'resting' | 'active' | 'stressed'>('resting')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const n = Number(bpm)
    if (!Number.isFinite(n) || n < 35 || n > 200) {
      setError('Please enter a valid BPM (35–200).')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveHeartRateRecord({
        patientId,
        timestamp: new Date(),
        bpm: Math.round(n),
        source: 'manual',
        confidence: 95,
        context,
      })
      onSave()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save heart rate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-[min(100%,520px)] rounded-2xl border border-slate-700 bg-slate-950 p-5 text-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">❤️ Add heart rate reading</p>
            <p className="mt-1 text-xs text-slate-400">Manual entry (BPM)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-300">
            BPM
            <input
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="72"
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              inputMode="numeric"
            />
          </label>
          <label className="text-xs text-slate-300">
            Context
            <select
              value={context}
              onChange={(e) => setContext(e.target.value as typeof context)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              <option value="resting">Resting</option>
              <option value="active">Active</option>
              <option value="stressed">Stressed</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="min-h-[44px] rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

