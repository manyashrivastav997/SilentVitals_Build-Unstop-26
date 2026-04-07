import { useState } from 'react'
import { DoctorDashboard } from './components/DoctorDashboard'
import { DoctorPatientDetail } from './components/DoctorPatientDetail'
import NurseDashboard from './components/NurseDashboard'
import NursePatientDetail from './components/NursePatientDetail'
import HospitalPatientDashboard from './components/HospitalPatientDashboard'
import HospitalPatientStressCheck from './components/HospitalPatientStressCheck'
import HospitalGuardianDashboard from './components/HospitalGuardianDashboard'
import HospitalGuardianLogin from './components/HospitalGuardianLogin'
import StressCheckinApp from './components/StressCheckinApp'
import { LoginPage } from './pages/LoginPage'
import { useUser } from './contexts/UserContext'

export default function App() {
  const { selected, currentUser } = useUser()

  if (!selected) {
    return <LoginPage />
  }

  const roleLabel =
    selected.mode === 'hospital'
      ? selected.role === 'doctor'
        ? 'Doctor 👨‍⚕️'
        : selected.role === 'nurse'
        ? 'Nurse 👩‍⚕️'
        : selected.role === 'patient'
        ? 'Patient 🧑'
        : 'Guardian 👪'
      : selected.role === 'patient'
      ? 'Home Patient 🧑'
      : 'Home Guardian 👪'

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [isStressCheckActive, setIsStressCheckActive] = useState(false)

  if (selected.mode === 'hospital') {
    switch (selected.role) {
      case 'doctor':
        if (selectedPatientId) {
          return (
            <DoctorPatientDetail
              patientId={selectedPatientId}
              onBack={() => setSelectedPatientId(null)}
            />
          )
        }
        return <DoctorDashboard onOpenPatient={(id) => setSelectedPatientId(id)} />
      case 'nurse':
        if (selectedPatientId) {
          return (
            <NursePatientDetail
              patientId={selectedPatientId}
              onBack={() => setSelectedPatientId(null)}
            />
          )
        }
        return <NurseDashboard onOpenPatient={(id) => setSelectedPatientId(id)} />
      case 'patient': {
        const pid = currentUser?.patientId ?? currentUser?.id ?? null
        if (!pid) return <LoginPage />
        if (isStressCheckActive) {
          return (
            <HospitalPatientStressCheck
              patientId={pid}
              onComplete={() => setIsStressCheckActive(false)}
              onCancel={() => setIsStressCheckActive(false)}
            />
          )
        }
        return (
          <HospitalPatientDashboard
            patientId={pid}
            onStartCheck={() => setIsStressCheckActive(true)}
          />
        )
      }
      case 'guardian':
        if (!currentUser?.patientId) {
          return <HospitalGuardianLogin />
        }
        return (
          <HospitalGuardianDashboard
            patientId={currentUser.patientId}
            guardianId={currentUser.id}
            relationship={currentUser.relationship ?? 'Family Member'}
          />
        )
      default:
        // Fall through to existing check-in UI, but hospital mode must not show tips panel.
        break
    }
  }

  return <StressCheckinApp roleLabel={roleLabel} />
}
