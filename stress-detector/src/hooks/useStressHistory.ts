import { useCallback, useMemo, useState } from 'react'
import { LS } from '../constants'
import type { StressLevel } from './useStressAggregator'
import { levelToLabel } from './useStressAggregator'

export type StressRecord = {
  timestamp: string
  score: number
  level: 'Low' | 'Medium' | 'High'
}

const MAX_RECORDS = 48

function readRecords(): StressRecord[] {
  try {
    const raw = localStorage.getItem(LS.history)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StressRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRecords(records: StressRecord[]) {
  localStorage.setItem(LS.history, JSON.stringify(records))
}

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function useStressHistory() {
  const [records, setRecords] = useState<StressRecord[]>(() => readRecords())

  const refresh = useCallback(() => setRecords(readRecords()), [])

  const append = useCallback((score: number, level: StressLevel) => {
    const rec: StressRecord = {
      timestamp: new Date().toISOString(),
      score,
      level: levelToLabel(level),
    }
    setRecords((prev) => {
      const next = [rec, ...prev].slice(0, MAX_RECORDS)
      writeRecords(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(LS.history)
    setRecords([])
  }, [])

  const todayRecords = useMemo(() => {
    const t0 = startOfToday()
    return records
      .filter((r) => new Date(r.timestamp).getTime() >= t0)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [records])

  const todayStats = useMemo(() => {
    const tr = todayRecords
    if (tr.length === 0) {
      return {
        average: 0,
        highest: 0,
        highestTime: null as string | null,
        total: 0,
      }
    }
    const scores = tr.map((r) => r.score)
    const sum = scores.reduce((a, b) => a + b, 0)
    let hi = scores[0]!
    let hiIdx = 0
    scores.forEach((s, i) => {
      if (s > hi) {
        hi = s
        hiIdx = i
      }
    })
    return {
      average: sum / tr.length,
      highest: hi,
      highestTime: tr[hiIdx]!.timestamp,
      total: tr.length,
    }
  }, [todayRecords])

  return {
    records,
    append,
    clearAll,
    refresh,
    todayRecords,
    todayStats,
  }
}
