import { useCallback, useEffect, useState } from 'react'
import { LS } from '../constants'

const DEFAULT_INTERVAL_MIN = 60
const SNOOZE_MS = 10 * 60 * 1000

function readIntervalMinutes(): number {
  const v = localStorage.getItem(LS.intervalMinutes)
  const n = v ? parseInt(v, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERVAL_MIN
}

function readLastCheckIn(): number | null {
  const v = localStorage.getItem(LS.lastCheckIn)
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

function readSnoozeUntil(): number {
  const v = localStorage.getItem(LS.snoozeUntil)
  if (!v) return 0
  const t = parseInt(v, 10)
  return Number.isFinite(t) ? t : 0
}

function readFirstOpen(): number {
  const v = localStorage.getItem(LS.firstOpen)
  if (v) {
    const t = parseInt(v, 10)
    if (Number.isFinite(t)) return t
  }
  const now = Date.now()
  localStorage.setItem(LS.firstOpen, String(now))
  return now
}

/** When the next reminder should fire (for display / comparison). */
export function computeNextFireMs(): number {
  const now = Date.now()
  const intervalMs = readIntervalMinutes() * 60 * 1000
  const last = readLastCheckIn()
  const snooze = readSnoozeUntil()

  if (snooze > now) return snooze

  if (last === null) {
    return readFirstOpen() + intervalMs
  }

  return last + intervalMs
}

export function useIntervalScheduler(onStartNow: () => void) {
  const [intervalMinutes, setIntervalMinutesState] = useState(readIntervalMinutes)
  const [nextFireAt, setNextFireAt] = useState(() => computeNextFireMs())
  const [showBanner, setShowBanner] = useState(false)
  const [minutesUntilNext, setMinutesUntilNext] = useState(() => {
    const now = Date.now()
    return Math.max(0, Math.ceil((computeNextFireMs() - now) / 60000))
  })

  const tick = useCallback(() => {
    const now = Date.now()
    const next = computeNextFireMs()
    setNextFireAt(next)
    setMinutesUntilNext(Math.max(0, Math.ceil((next - now) / 60000)))
    if (document.visibilityState !== 'visible') return
    const snooze = readSnoozeUntil()
    if (snooze > now) return
    if (now >= next) setShowBanner(true)
  }, [])

  useEffect(() => {
    const id = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [tick, intervalMinutes])

  const setIntervalMinutes = useCallback((min: number) => {
    localStorage.setItem(LS.intervalMinutes, String(min))
    setIntervalMinutesState(min)
    setNextFireAt(computeNextFireMs())
  }, [])

  const notifySessionCompleted = useCallback(() => {
    localStorage.setItem(LS.lastCheckIn, new Date().toISOString())
    localStorage.removeItem(LS.snoozeUntil)
    setShowBanner(false)
    setNextFireAt(computeNextFireMs())
  }, [])

  const snooze = useCallback(() => {
    localStorage.setItem(LS.snoozeUntil, String(Date.now() + SNOOZE_MS))
    setShowBanner(false)
    setNextFireAt(computeNextFireMs())
  }, [])

  const dismissBanner = useCallback(() => {
    localStorage.setItem(LS.snoozeUntil, String(Date.now() + SNOOZE_MS))
    setShowBanner(false)
    setNextFireAt(computeNextFireMs())
  }, [])

  const startNow = useCallback(() => {
    setShowBanner(false)
    onStartNow()
  }, [onStartNow])

  return {
    intervalMinutes,
    setIntervalMinutes,
    nextFireAt,
    minutesUntilNext,
    showBanner,
    snooze,
    dismissBanner,
    startNow,
    notifySessionCompleted,
  }
}
