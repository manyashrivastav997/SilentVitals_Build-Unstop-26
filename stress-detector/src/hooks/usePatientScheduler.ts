import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const SNOOZE_MS = 10 * 60 * 1000
const MISS_AFTER_MS = 5 * 60 * 1000

function snoozeKey(patientId: string) {
  return `silentvitals.patient.${patientId}.snoozeUntil`
}

function readSnoozeUntil(patientId: string) {
  const v = localStorage.getItem(snoozeKey(patientId))
  const t = v ? parseInt(v, 10) : 0
  return Number.isFinite(t) ? t : 0
}

export function usePatientScheduler({
  patientId,
  lastCheckIn,
  intervalMinutes,
  onStartNow,
  onMissed,
}: {
  patientId: string
  lastCheckIn: Date
  intervalMinutes: number
  onStartNow: () => void
  onMissed: (dueAt: Date) => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const [showBanner, setShowBanner] = useState(false)

  const nextDue = useMemo(() => {
    const last = +new Date(lastCheckIn)
    return new Date(last + intervalMinutes * 60000)
  }, [lastCheckIn, intervalMinutes])

  const minutesUntilNext = useMemo(() => {
    const diff = nextDue.getTime() - now
    return Math.max(0, Math.ceil(diff / 60000))
  }, [nextDue, now])

  const missTimerRef = useRef<number | null>(null)

  const clearMissTimer = () => {
    if (missTimerRef.current != null) window.clearTimeout(missTimerRef.current)
    missTimerRef.current = null
  }

  const tick = useCallback(() => {
    const t = Date.now()
    setNow(t)
    if (document.visibilityState !== 'visible') return

    const snoozeUntil = readSnoozeUntil(patientId)
    if (snoozeUntil > t) return

    if (t >= nextDue.getTime()) {
      setShowBanner(true)
    }
  }, [nextDue, patientId])

  useEffect(() => {
    const id = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [tick])

  useEffect(() => {
    clearMissTimer()
    if (!showBanner) return
    const dueAt = new Date(nextDue)
    missTimerRef.current = window.setTimeout(() => {
      onMissed(dueAt)
      setShowBanner(false)
    }, MISS_AFTER_MS)
    return () => clearMissTimer()
  }, [nextDue, onMissed, showBanner])

  const snooze = useCallback(() => {
    localStorage.setItem(snoozeKey(patientId), String(Date.now() + SNOOZE_MS))
    setShowBanner(false)
    clearMissTimer()
  }, [patientId])

  const dismissBanner = useCallback(() => {
    localStorage.setItem(snoozeKey(patientId), String(Date.now() + SNOOZE_MS))
    setShowBanner(false)
    clearMissTimer()
  }, [patientId])

  const startNow = useCallback(() => {
    setShowBanner(false)
    clearMissTimer()
    onStartNow()
  }, [onStartNow])

  return {
    now: new Date(now),
    nextDue,
    minutesUntilNext,
    showBanner,
    snooze,
    dismissBanner,
    startNow,
  }
}

