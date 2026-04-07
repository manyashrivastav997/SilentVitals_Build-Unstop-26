import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LogOut, Users, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useUser } from '../contexts/UserContext'
import {
  getNurseStats,
  getPatientsByNurseId,
  type PatientWithLatestStress,
} from '../db/indexedDb'
import { NotificationBell } from './shared/NotificationBell'
import { PatientCard } from './shared/PatientCard'

type Props = {
  onOpenPatient: (id: string) => void
}

type Filter = 'all' | 'critical' | 'stable'
type SortBy = 'stress' | 'lastCheck' | 'room'

function statCardBase() {
  return 'bg-slate-900/50 border border-teal-800/30 rounded-xl p-4'
}

function statValueClass() {
  return 'mt-2 text-2xl font-semibold text-white'
}

function isStable(p: PatientWithLatestStress) {
  return p.severity !== 'high'
}

export default function NurseDashboard({ onOpenPatient }: Props) {
  const { logout, currentUser, selected } = useUser()
  const [now, setNow] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [patients, setPatients] = useState<PatientWithLatestStress[]>([])
  const [criticalPatients, setCriticalPatients] = useState(0)
  const [overdueChecks, setOverdueChecks] = useState(0)
  const [todaysCheckins, setTodaysCheckins] = useState(0)

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('stress')

  const nurseId = currentUser?.role === 'nurse' ? currentUser.id : 'nurse-1'
  const nurseName =
    currentUser?.role === 'nurse' ? currentUser.name.replace(/^Nurse\s+/i, '') : 'Jennifer Lee'

  const refresh = async () => {
    if (!selected || selected.mode !== 'hospital' || selected.role !== 'nurse') return
    setError(null)
    try {
      const [p, stats] = await Promise.all([
        getPatientsByNurseId(nurseId),
        getNurseStats(nurseId),
      ])
      setPatients(p)
      setCriticalPatients(stats.criticalPatients)
      setOverdueChecks(stats.overdueChecks)
      setTodaysCheckins(stats.todaysCheckins)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nurseId, selected?.mode, selected?.role])

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date())
      void refresh()
    }, 30_000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nurseId, selected?.mode, selected?.role])

  const assignedCount = patients.length

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = patients.slice()

    if (filter === 'critical') list = list.filter((p) => p.severity === 'high')
    if (filter === 'stable') list = list.filter((p) => isStable(p))
    if (q) {
      list = list.filter((p) => {
        const room = `${p.roomNumber}${p.bedNumber}`.toLowerCase()
        return p.name.toLowerCase().includes(q) || room.includes(q)
      })
    }

    list.sort((a, b) => {
      if (sortBy === 'stress') {
        const as = a.latestRecord?.score ?? -1
        const bs = b.latestRecord?.score ?? -1
        return bs - as
      }
      if (sortBy === 'lastCheck') {
        return +new Date(b.lastCheckIn) - +new Date(a.lastCheckIn)
      }
      const ar = `${a.roomNumber}`.padStart(4, '0')
      const br = `${b.roomNumber}`.padStart(4, '0')
      if (ar !== br) return ar.localeCompare(br)
      return `${a.bedNumber}`.localeCompare(`${b.bedNumber}`)
    })

    return list
  }, [patients, filter, search, sortBy])

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black text-slate-50">
      <header className="w-full bg-teal-950 border-b border-teal-800 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
              SilentVitals · Hospital
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              Welcome back, Nurse {nurseName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden sm:block text-xs text-teal-100/80">
              {now.toLocaleDateString()} • {now.toLocaleTimeString()}
            </p>
            <NotificationBell
              criticalPatients={criticalPatients}
              overdueChecks={overdueChecks}
              onShowCritical={() => setFilter('critical')}
              onShowOverdue={() => {
                setFilter('all')
                setSearch('')
                setSortBy('lastCheck')
              }}
            />
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-6xl rounded-xl bg-slate-900/40 p-3 ring-1 ring-teal-800/30">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
                All Patients
              </Chip>
              <Chip active={filter === 'critical'} onClick={() => setFilter('critical')}>
                Critical Only
              </Chip>
              <Chip active={filter === 'stable'} onClick={() => setFilter('stable')}>
                Stable
              </Chip>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative">
                <span className="sr-only">Search</span>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patients..."
                  className="h-11 w-full rounded-full border border-teal-800/40 bg-slate-950 pl-10 pr-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-700 sm:w-64"
                />
              </label>
              <label className="text-xs text-slate-300">
                <span className="mr-2 text-slate-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="h-11 rounded-full border border-teal-800/40 bg-slate-950 px-3 text-sm text-slate-100"
                >
                  <option value="stress">Stress Level</option>
                  <option value="lastCheck">Last Check-in</option>
                  <option value="room">Room</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
            {error}{' '}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-2 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500"
            >
              Retry
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-teal-900 to-teal-950 p-[1px] shadow-lg">
            <div className={`${statCardBase()} bg-slate-950/80`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-300">Assigned Patients</p>
                <span className="rounded-full bg-slate-900/80 p-1.5 text-teal-200">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <p className={statValueClass()}>{loading ? '—' : assignedCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">Current caseload</p>
            </div>
          </div>

          <div className={`${statCardBase()} border border-red-500/30`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">Critical Patients</p>
              <span className="rounded-full bg-red-950/40 p-1.5 text-red-200">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <p className={statValueClass()}>{loading ? '—' : criticalPatients}</p>
            <p className="mt-1 text-[11px] text-slate-400">Requires attention</p>
          </div>

          <div className={`${statCardBase()} border border-sky-500/30`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">Today&apos;s Check-ins</p>
              <span className="rounded-full bg-sky-950/40 p-1.5 text-sky-200">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className={statValueClass()}>{loading ? '—' : todaysCheckins}</p>
            <p className="mt-1 text-[11px] text-slate-400">Completed today</p>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Patients</h2>
            <p className="text-xs text-slate-500">{visible.length} shown</p>
          </div>

          <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  variant="nurse"
                  onViewDetails={() => onOpenPatient(p.id)}
                />
              ))}
            </div>

            {!loading && patients.length === 0 && (
              <div className="mt-6 rounded-xl border border-teal-800/30 bg-slate-900/30 p-6 text-center">
                <p className="text-sm font-semibold text-slate-100">
                  No patients currently assigned
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  When patients are assigned to you, they&apos;ll appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? 'bg-teal-600 text-white'
          : 'bg-slate-950 text-slate-200 ring-1 ring-teal-800/40 hover:bg-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

