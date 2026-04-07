import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Mode = 'hospital' | 'home'
export type HospitalRole = 'doctor' | 'nurse' | 'patient' | 'guardian'
export type HomeRole = 'patient' | 'guardian'

export type SelectedMode =
  | { mode: 'hospital'; role: HospitalRole }
  | { mode: 'home'; role: HomeRole }
  | null

const LS_KEY = 'silentvitals.sessionV1'

export type CurrentUser = {
  id: string
  name: string
  email?: string
  mode: Mode
  role: HospitalRole | HomeRole
  patientId?: string
  relationship?: string
  patientName?: string
}

type UserContextValue = {
  selected: SelectedMode
  currentUser: CurrentUser | null
  loginHospitalPatient: (user: { id: string; name: string; email: string }) => void
  loginHospitalGuardian: (user: {
    id: string
    name: string
    email: string
    patientId: string
    patientName: string
    relationship: string
  }) => void
  setHospitalRole: (role: HospitalRole) => void
  setHomeRole: (role: HomeRole) => void
  logout: () => void
  permissions: {
    canChangeInterval: boolean
    canViewPatientList: boolean
    canUseCamera: boolean
    showTipsPanel: boolean
    isGuardian: boolean
  }
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectedMode>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { selected: SelectedMode } | SelectedMode
      if (parsed && typeof parsed === 'object' && 'selected' in parsed) {
        return (parsed as { selected: SelectedMode }).selected ?? null
      }
      return (parsed as SelectedMode) ?? null
    } catch {
      return null
    }
  })

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { currentUser?: CurrentUser | null }
      return parsed?.currentUser ?? null
    } catch {
      return null
    }
  })

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ selected, currentUser }))
  }, [selected, currentUser])

  const setHospitalRole = useCallback((role: HospitalRole) => {
    setSelected({ mode: 'hospital', role })
  }, [])

  const setHomeRole = useCallback((role: HomeRole) => {
    setSelected({ mode: 'home', role })
    if (role === 'patient') {
      setCurrentUser((u) =>
        u ?? { id: 'home-patient-1', name: 'Home Patient', mode: 'home', role: 'patient', patientId: 'home-patient-1' },
      )
    } else {
      setCurrentUser((u) =>
        u ?? {
          id: 'home-guardian-1',
          name: 'Home Guardian',
          mode: 'home',
          role: 'guardian',
          patientId: 'home-patient-1',
          relationship: 'Guardian',
          patientName: 'Home Patient',
        },
      )
    }
  }, [])

  const logout = useCallback(() => {
    setSelected(null)
    setCurrentUser(null)
    localStorage.removeItem(LS_KEY)
  }, [])

  const permissions = useMemo(() => {
    if (!selected) {
      return {
        canChangeInterval: false,
        canViewPatientList: false,
        canUseCamera: false,
        showTipsPanel: false,
        isGuardian: false,
      }
    }

    const { mode, role } = selected
    const isGuardian = role === 'guardian'
    const canChangeInterval = mode === 'hospital' && role === 'doctor'
    const canViewPatientList =
      mode === 'hospital' && (role === 'doctor' || role === 'nurse')
    const canUseCamera = !isGuardian
    const showTipsPanel = mode === 'home' && role === 'patient'

    return {
      canChangeInterval,
      canViewPatientList,
      canUseCamera,
      showTipsPanel,
      isGuardian,
    }
  }, [selected])

  // Auto-fill demo identities for doctor/nurse when not explicitly logged in.
  useEffect(() => {
    if (!selected) return
    if (selected.mode !== 'hospital') return
    if (selected.role === 'doctor') {
      setCurrentUser((u) => u ?? { id: 'doctor-1', name: 'Dr. Sarah Wilson', mode: 'hospital', role: 'doctor' })
    }
    if (selected.role === 'nurse') {
      setCurrentUser((u) => u ?? { id: 'nurse-1', name: 'Nurse Jennifer Lee', mode: 'hospital', role: 'nurse' })
    }
  }, [selected])

  const loginHospitalPatient = useCallback(
    (user: { id: string; name: string; email: string }) => {
      setSelected({ mode: 'hospital', role: 'patient' })
      setCurrentUser({
        id: user.id,
        patientId: user.id,
        name: user.name,
        email: user.email,
        mode: 'hospital',
        role: 'patient',
      })
      localStorage.setItem(LS_KEY, JSON.stringify({ selected: { mode: 'hospital', role: 'patient' }, currentUser: {
        id: user.id,
        patientId: user.id,
        name: user.name,
        email: user.email,
        mode: 'hospital',
        role: 'patient',
      } }))
    },
    [],
  )

  const loginHospitalGuardian = useCallback(
    (user: {
      id: string
      name: string
      email: string
      patientId: string
      patientName: string
      relationship: string
    }) => {
      setSelected({ mode: 'hospital', role: 'guardian' })
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        patientId: user.patientId,
        patientName: user.patientName,
        relationship: user.relationship,
        mode: 'hospital',
        role: 'guardian',
      })
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          selected: { mode: 'hospital', role: 'guardian' },
          currentUser: {
            id: user.id,
            name: user.name,
            email: user.email,
            patientId: user.patientId,
            patientName: user.patientName,
            relationship: user.relationship,
            mode: 'hospital',
            role: 'guardian',
          },
        }),
      )
    },
    [],
  )

  return (
    <UserContext.Provider
      value={{
        selected,
        currentUser,
        loginHospitalPatient,
        loginHospitalGuardian,
        setHospitalRole,
        setHomeRole,
        logout,
        permissions,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider')
  }
  return ctx
}

