type CheckInNotificationProps = {
  visible: boolean
  onStartNow: () => void
  onSnooze: () => void
  onDismiss: () => void
}

export function CheckInNotification({
  visible,
  onStartNow,
  onSnooze,
  onDismiss,
}: CheckInNotificationProps) {
  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed left-1/2 top-4 z-50 w-[min(100%,28rem)] -translate-x-1/2 rounded-xl border border-amber-500/40 bg-amber-950/95 px-4 py-3 shadow-xl shadow-black/40 ring-1 ring-amber-500/30 backdrop-blur"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-amber-100">Time for your stress check-in!</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStartNow}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Start Now
          </button>
          <button
            type="button"
            onClick={onSnooze}
            className="rounded-full bg-zinc-700 px-4 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-600"
          >
            Snooze 10 min
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full px-2 text-xs text-zinc-500 hover:text-zinc-300"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
