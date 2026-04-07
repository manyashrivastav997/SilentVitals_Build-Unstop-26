import { useMemo, useState } from 'react'
import type { StressRecord } from '../../types/db'

export interface StressRecordsTableProps {
  records: StressRecord[]
  maxRows?: number
}

type SortKey = 'timestamp' | 'score' | 'level' | 'faceConfidence' | 'audioConfidence'
type SortDir = 'asc' | 'desc'

function sortValue(r: StressRecord, key: SortKey) {
  switch (key) {
    case 'timestamp':
      return +new Date(r.timestamp)
    case 'score':
      return r.score
    case 'level':
      return r.level
    case 'faceConfidence':
      return r.faceConfidence
    case 'audioConfidence':
      return r.audioConfidence
    default:
      return 0
  }
}

function thClass(active: boolean) {
  return `cursor-pointer select-none px-2 py-1.5 text-left text-[10px] uppercase ${
    active ? 'text-teal-200' : 'text-slate-500'
  }`
}

export function StressRecordsTable({ records, maxRows = 20 }: StressRecordsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const rows = useMemo(() => {
    const sorted = records
      .slice()
      .sort((a, b) => {
        const av = sortValue(a, sortKey)
        const bv = sortValue(b, sortKey)
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
      .slice(0, maxRows)
    return sorted
  }, [records, maxRows, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'level' ? 'asc' : 'desc')
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[11px] text-slate-200">
        <thead className="border-b border-teal-800/40">
          <tr>
            <th
              className={thClass(sortKey === 'timestamp')}
              onClick={() => toggleSort('timestamp')}
            >
              Time {sortKey === 'timestamp' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th
              className={thClass(sortKey === 'score')}
              onClick={() => toggleSort('score')}
            >
              Score {sortKey === 'score' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th
              className={thClass(sortKey === 'level')}
              onClick={() => toggleSort('level')}
            >
              Level {sortKey === 'level' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th
              className={thClass(sortKey === 'faceConfidence')}
              onClick={() => toggleSort('faceConfidence')}
            >
              Face conf. {sortKey === 'faceConfidence' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th
              className={thClass(sortKey === 'audioConfidence')}
              onClick={() => toggleSort('audioConfidence')}
            >
              Audio conf.{' '}
              {sortKey === 'audioConfidence' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-900/60">
              <td className="px-2 py-1.5 text-slate-300">
                {new Date(r.timestamp).toLocaleString()}
              </td>
              <td className="px-2 py-1.5 font-mono">{r.score.toFixed(0)}%</td>
              <td className="px-2 py-1.5">{r.level}</td>
              <td className="px-2 py-1.5">{Math.round(r.faceConfidence * 100)}%</td>
              <td className="px-2 py-1.5">{Math.round(r.audioConfidence * 100)}%</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-2 py-2 text-slate-500" colSpan={5}>
                No records available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

