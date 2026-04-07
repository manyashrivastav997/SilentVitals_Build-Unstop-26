import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useUser } from '../contexts/UserContext'
import {
  createGuardian,
  getGuardianByEmail,
  getGuardianLinkByCode,
  updateGuardianLink,
} from '../db/indexedDb'

export default function HospitalGuardianLogin() {
  const { loginHospitalGuardian, logout } = useUser()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    const e = email.trim().toLowerCase()
    const c = code.trim().toUpperCase()
    if (!e || !c) return
    setLoading(true)
    setError(null)
    try {
      const link = await getGuardianLinkByCode(c)
      if (!link) {
        setError('Invalid access code. Please check with hospital staff.')
        return
      }
      if (link.expiresAt && +new Date(link.expiresAt) < Date.now()) {
        setError('This access code has expired. Please contact hospital staff for a new code.')
        return
      }

      let guardian = await getGuardianByEmail(e)
      if (!guardian) {
        guardian = await createGuardian({
          email: e,
          name: e.split('@')[0] ?? 'Guardian',
          role: 'guardian',
          mode: 'hospital',
          createdAt: new Date(),
        })
      }

      if (!link.guardianId) {
        await updateGuardianLink(c, guardian.id)
      } else if (link.guardianId !== guardian.id) {
        setError('This access code is already linked to a different guardian.')
        return
      }

      loginHospitalGuardian({
        id: guardian.id,
        name: guardian.name,
        email: guardian.email,
        patientId: link.patientId,
        patientName: link.patientName ?? 'Patient',
        relationship: link.relationship ?? 'Family Member',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950 px-4 py-6 text-slate-50">
      <div className="w-[min(100%,560px)] rounded-[28px] bg-white/5 p-[1px] shadow-2xl shadow-black/60 ring-1 ring-white/15">
        <div className="rounded-[26px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">
              👪 Hospital guardian login
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Enter your email and the patient access code provided by hospital staff.
            </p>
          </header>

          <div className="space-y-3">
            <label className="text-xs text-slate-300">
              👤 Your Email Address
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guardian@email.com"
                className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                inputMode="email"
                autoComplete="email"
              />
            </label>

            <label className="text-xs text-slate-300">
              🔑 Patient Access Code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PAT-ABC123"
                className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                autoCapitalize="characters"
              />
            </label>

            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={loading || email.trim().length === 0 || code.trim().length === 0}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {loading ? 'Linking…' : 'Link to Patient →'}
            </button>

            {error ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                ℹ️ Need help? Contact Patient Relations.
              </p>
            )}

            <button
              type="button"
              onClick={logout}
              className="w-full rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700"
            >
              Back to role selection
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

