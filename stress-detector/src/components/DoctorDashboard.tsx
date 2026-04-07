import { useEffect, useState } from 'react'
import { Bell, LogOut, Users, Activity, BarChart2, AlertTriangle } from 'lucide-react'
import { useUser } from '../contexts/UserContext'
import {
  getAllPatientsWithLatestStress,
  getDoctorStats,
  type DoctorStats,
  type PatientWithLatestStress,
} from '../db/indexedDb'
import { PatientCard } from './shared/PatientCard'

type Props = {
  onOpenPatient: (id: string) => void
}

export function DoctorDashboard({ onOpenPatient }: Props) {
  const { logout } = useUser()
  const [now, setNow] = useState(() => new Date())
  const [stats, setStats] = useState<DoctorStats | null>(null)
  const [patients, setPatients] = useState<PatientWithLatestStress[]>([])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    void (async () => {
      const [s, p] = await Promise.all([
        getDoctorStats(),
        getAllPatientsWithLatestStress(),
      ])
      setStats(s)
      setPatients(p)
    })()
  }, [])

  const doctorName = 'Dr. Sarah Wilson'

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-950 to-black px-4 pb-10 pt-4 text-slate-50 sm:px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl bg-slate-950/90 px-5 py-4 shadow-lg shadow-black/50 ring-1 ring-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            SilentVitals · Hospital
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            Welcome back, {doctorName}
          </p>
          <p className="text-xs text-slate-400">
            {now.toLocaleDateString()} • {now.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative rounded-full bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[8px] font-semibold text-white">
              3
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto mt-5 flex max-w-6xl flex-col gap-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            title="Total patients"
            value={stats ? stats.totalPatients.toString() : '—'}
            sub="Admitted and under monitoring"
            gradient="from-sky-600 to-sky-500"
          />
          <StatCard
            icon={AlertTriangle}
            title="Critical patients"
            value={stats ? stats.criticalPatients.toString() : '—'}
            sub="Severity marked as high"
            gradient="from-rose-600 to-orange-500"
          />
          <StatCard
            icon={Activity}
            title="Today's check-ins"
            value={stats ? stats.todaysCheckins.toString() : '—'}
            sub="Completed stress sessions"
            gradient="from-emerald-600 to-emerald-500"
          />
          <StatCard
            icon={BarChart2}
            title="Average stress"
            value={stats ? `${Math.round(stats.todaysAvgStress)}%` : '—'}
            sub="Across all patients today"
            gradient="from-indigo-600 to-sky-500"
          />
        </section>

        <section className="mt-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Patients</h2>
            <p className="text-xs text-slate-500">
              {patients.length} currently admitted
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {patients.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                variant="doctor"
                onViewDetails={() => onOpenPatient(p.id)}
                onAdjustInterval={() => onOpenPatient(p.id)}
              />
            ))}
            {patients.length === 0 && (
              <p className="text-sm text-slate-400">
                No patients found in the database. Seed data should create a few demo
                patients.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

type StatCardProps = {
  icon: typeof Users
  title: string
  value: string
  sub: string
  gradient: string
}

function StatCard({ icon: Icon, title, value, sub, gradient }: StatCardProps) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-[1px] shadow-lg`}>
      <div className="flex h-full flex-col justify-between rounded-2xl bg-slate-950/95 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-300">{title}</p>
          <span className="rounded-full bg-slate-900/80 p-1.5 text-sky-300">
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

