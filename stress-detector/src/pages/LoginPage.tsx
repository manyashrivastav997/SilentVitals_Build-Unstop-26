import { useMemo, useState } from 'react'
import { LogIn } from 'lucide-react'
import { useUser, type HospitalRole, type HomeRole } from '../contexts/UserContext'
import { authenticatePatientByEmail } from '../db/indexedDb'

type Step = 'mode' | 'hospitalRoles' | 'homeRoles' | 'guardianCode' | 'patientEmail'

export function LoginPage() {
  const { setHospitalRole, setHomeRole, loginHospitalPatient } = useUser()
  const [step, setStep] = useState<Step>('mode')
  const [pendingMode, setPendingMode] = useState<'hospital' | 'home' | null>(null)
  const [shareCode, setShareCode] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [patientError, setPatientError] = useState<string | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)

  const chooseMode = (mode: 'hospital' | 'home') => {
    setPendingMode(mode)
    setStep(mode === 'hospital' ? 'hospitalRoles' : 'homeRoles')
  }

  const pickHospitalRole = (role: HospitalRole) => {
    if (role === 'guardian') {
      setPendingMode('hospital')
      setStep('guardianCode')
    } else if (role === 'patient') {
      setPendingMode('hospital')
      setStep('patientEmail')
    } else {
      setHospitalRole(role)
    }
  }

  const pickHomeRole = (role: HomeRole) => {
    if (role === 'guardian') {
      setPendingMode('home')
      setStep('guardianCode')
    } else {
      setHomeRole(role)
    }
  }

  const connectGuardian = () => {
    if (!shareCode.trim()) return
    if (pendingMode === 'hospital') setHospitalRole('guardian')
    else setHomeRole('guardian')
  }

  const patientHint = useMemo(() => {
    return 'Try: john.doe@example.com'
  }, [])

  const handlePatientLogin = async () => {
    const email = patientEmail.trim()
    if (!email) return
    setPatientLoading(true)
    setPatientError(null)
    try {
      const patient = await authenticatePatientByEmail(email)
      if (!patient) {
        setPatientError('Email not found. Please contact hospital administration.')
        return
      }
      loginHospitalPatient({ id: patient.id, name: patient.name, email: patient.email })
    } catch (e) {
      setPatientError(e instanceof Error ? e.message : 'Login failed. Please try again.')
    } finally {
      setPatientLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-sky-900 via-slate-950 to-slate-950 px-4 py-6 text-slate-50">
      <div className="w-[min(100%,980px)] rounded-[32px] bg-white/5 p-[1px] shadow-2xl shadow-black/60 ring-1 ring-white/20">
        <div className="relative flex flex-col gap-8 rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-7 py-7 md:flex-row md:px-10 md:py-9">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                <span className="text-lg font-semibold">SV</span>
              </div>
              <span className="text-sm font-semibold tracking-[0.22em] text-sky-300 uppercase">
                Silent Vitals
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
                Stress Detection System
              </h1>
              <p className="mt-3 max-w-md text-sm text-slate-300">
                AI-powered wellness monitoring using just your smartphone camera
                and microphone. Choose your usage environment.
              </p>
            </div>
            <div className="grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
              <FeaturePill label="Heart rate detection" />
              <FeaturePill label="Stress analysis" />
              <FeaturePill label="Real-time alerts" />
            </div>
            <div className="hidden rounded-2xl bg-slate-950/60 p-4 text-xs text-slate-300 shadow-inner shadow-black/40 md:block">
              <p className="mb-2 font-semibold text-slate-100">How it works</p>
              <ul className="grid gap-2 md:grid-cols-3">
                <li className="rounded-xl bg-slate-900/80 p-3">
                  <p className="text-[11px] font-medium text-sky-300">Camera scans</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Analyze your face for expressions and blinks.
                  </p>
                </li>
                <li className="rounded-xl bg-slate-900/80 p-3">
                  <p className="text-[11px] font-medium text-emerald-300">Voice analysis</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Listen to your voice for stress signatures.
                  </p>
                </li>
                <li className="rounded-xl bg-slate-900/80 p-3">
                  <p className="text-[11px] font-medium text-amber-300">
                    Real-time alerts
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Instant feedback on your stress level.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex-1 rounded-2xl bg-slate-950/80 p-5 ring-1 ring-slate-800/80">
            {step === 'mode' && <ModeStep onSelect={chooseMode} />}
            {step === 'hospitalRoles' && (
              <HospitalRolesStep
                onSelect={pickHospitalRole}
                onBack={() => setStep('mode')}
              />
            )}
            {step === 'homeRoles' && (
              <HomeRolesStep onSelect={pickHomeRole} onBack={() => setStep('mode')} />
            )}
            {step === 'guardianCode' && (
              <GuardianCodeStep
                mode={pendingMode ?? 'home'}
                shareCode={shareCode}
                onChangeCode={setShareCode}
                onConnect={connectGuardian}
                onBack={() =>
                  setStep(pendingMode === 'hospital' ? 'hospitalRoles' : 'homeRoles')
                }
              />
            )}
            {step === 'patientEmail' && (
              <PatientEmailStep
                email={patientEmail}
                onChangeEmail={setPatientEmail}
                onContinue={() => void handlePatientLogin()}
                loading={patientLoading}
                error={patientError}
                hint={patientHint}
                onBack={() => setStep('hospitalRoles')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturePill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 ring-1 ring-slate-700/70">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <span>{label}</span>
    </div>
  )
}

function ModeStep({ onSelect }: { onSelect: (mode: 'hospital' | 'home') => void }) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Choose environment
        </p>
        <p className="mt-1 text-sm text-slate-200">
          Your phone. Your health. No wearables.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect('hospital')}
          className="group flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-sky-600 via-sky-500 to-sky-600 px-4 py-4 text-left text-sm text-white shadow-lg shadow-sky-900/60"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg">
              🏥
            </div>
            <div>
              <p className="font-semibold">Hospital Mode</p>
              <p className="text-xs text-sky-100/90">
                Clinical environment with patient monitoring.
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-sky-100/80">
            For doctors, nurses and in-patient care.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('home')}
          className="group flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-600 px-4 py-4 text-left text-sm text-white shadow-lg shadow-emerald-900/60"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg">
              🏠
            </div>
            <div>
              <p className="font-semibold">Home Mode</p>
              <p className="text-xs text-emerald-100/90">
                Personal wellness and stress management.
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-emerald-100/80">
            For daily check-ins and optional guardian view.
          </p>
        </button>
      </div>
    </div>
  )
}

function HospitalRolesStep({
  onSelect,
  onBack,
}: {
  onSelect: (r: HospitalRole) => void
  onBack: () => void
}) {
  const roles: { id: HospitalRole; label: string; icon: string; desc: string }[] = [
    { id: 'doctor', label: 'Doctor', icon: '👨‍⚕️', desc: 'Full control, can adjust intervals.' },
    { id: 'nurse', label: 'Nurse', icon: '👩‍⚕️', desc: 'View patients and monitor.' },
    { id: 'patient', label: 'Patient', icon: '🧑', desc: 'Personal stress monitoring.' },
    {
      id: 'guardian',
      label: 'Guardian',
      icon: '👪',
      desc: "Monitor a family member's stress.",
    },
  ]
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
      >
        ← Back
      </button>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Hospital mode
        </p>
        <p className="mt-1 text-sm text-slate-200">Select your role</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className="flex h-full flex-col justify-between rounded-2xl bg-slate-950/80 px-4 py-3 text-left text-sm text-slate-100 ring-1 ring-slate-700 hover:ring-sky-500"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{r.icon}</span>
              <p className="font-semibold">{r.label}</p>
            </div>
            <p className="mt-2 text-xs text-slate-400">{r.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function HomeRolesStep({
  onSelect,
  onBack,
}: {
  onSelect: (r: HomeRole) => void
  onBack: () => void
}) {
  const roles: { id: HomeRole; label: string; icon: string; desc: string }[] = [
    { id: 'patient', label: 'Patient', icon: '🧑', desc: 'Track your own stress levels.' },
    {
      id: 'guardian',
      label: 'Guardian',
      icon: '👪',
      desc: "Monitor a family member's stress.",
    },
  ]
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
      >
        ← Back
      </button>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Home mode
        </p>
        <p className="mt-1 text-sm text-slate-200">Select your role</p>
      </header>
      <div className="grid gap-3">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className="flex h-full flex-col justify-between rounded-2xl bg-slate-950/80 px-4 py-3 text-left text-sm text-slate-100 ring-1 ring-slate-700 hover:ring-emerald-500"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{r.icon}</span>
              <p className="font-semibold">{r.label}</p>
            </div>
            <p className="mt-2 text-xs text-slate-400">{r.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function GuardianCodeStep({
  mode,
  shareCode,
  onChangeCode,
  onConnect,
  onBack,
}: {
  mode: 'hospital' | 'home'
  shareCode: string
  onChangeCode: (v: string) => void
  onConnect: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
      >
        ← Back
      </button>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          {mode === 'hospital' ? 'Hospital guardian' : 'Home guardian'}
        </p>
        <p className="mt-1 text-sm text-slate-200">
          Enter the patient or share code to connect.
        </p>
      </header>
      <div className="space-y-3">
        <label className="text-xs text-slate-300">
          Code
          <input
            value={shareCode}
            onChange={(e) => onChangeCode(e.target.value)}
            placeholder={mode === 'home' ? 'HOME-ABC123' : 'WARD-101-JD'}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-400"
        >
          <LogIn className="h-3.5 w-3.5" />
          Start dashboard
        </button>
      </div>
    </div>
  )
}

function PatientEmailStep({
  email,
  onChangeEmail,
  onContinue,
  loading,
  error,
  hint,
  onBack,
}: {
  email: string
  onChangeEmail: (v: string) => void
  onContinue: () => void
  loading: boolean
  error: string | null
  hint: string
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
      >
        ← Back
      </button>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Hospital patient login
        </p>
        <p className="mt-1 text-sm text-slate-200">Enter the email provided by your hospital</p>
      </header>
      <div className="space-y-3">
        <label className="text-xs text-slate-300">
          📧 Email Address
          <input
            value={email}
            onChange={(e) => onChangeEmail(e.target.value)}
            placeholder="patient@hospital.com"
            className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            inputMode="email"
            autoComplete="email"
          />
        </label>
        <button
          type="button"
          onClick={onContinue}
          disabled={loading || email.trim().length === 0}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          <LogIn className="h-3.5 w-3.5" />
          {loading ? 'Checking…' : 'Continue →'}
        </button>
        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400">ℹ️ {hint}</p>
        )}
      </div>
    </div>
  )
}

