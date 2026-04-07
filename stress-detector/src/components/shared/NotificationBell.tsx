import { useMemo, useState } from 'react'
import { Bell } from 'lucide-react'

export interface NotificationBellProps {
  criticalPatients: number
  overdueChecks: number
  onShowCritical?: () => void
  onShowOverdue?: () => void
}

export function NotificationBell({
  criticalPatients,
  overdueChecks,
  onShowCritical,
  onShowOverdue,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const alerts = useMemo(
    () => (criticalPatients ?? 0) + (overdueChecks ?? 0),
    [criticalPatients, overdueChecks],
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full bg-slate-900 p-2 text-slate-200 hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {alerts > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {alerts}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-teal-800/50 bg-slate-950 shadow-2xl">
          <div className="border-b border-teal-800/40 px-3 py-2">
            <p className="text-xs font-semibold text-slate-100">Alerts</p>
            <p className="text-[11px] text-slate-500">Click to filter</p>
          </div>
          <div className="p-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                onShowCritical?.()
                setOpen(false)
              }}
              className="w-full rounded-lg bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-900"
            >
              ⚠️ {criticalPatients} patients with high severity
            </button>
            <button
              type="button"
              onClick={() => {
                onShowOverdue?.()
                setOpen(false)
              }}
              className="w-full rounded-lg bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-900"
            >
              ⏰ {overdueChecks} overdue check-ins
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

