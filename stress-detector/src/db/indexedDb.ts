import type {
  BlinkRateRecord,
  ClinicalNote,
  GuardianLink,
  HeartRateRecord,
  IntervalSettings,
  Patient,
  FatigueRecord,
  StressRecord,
  User,
} from '../types/db'

const DB_NAME = 'StressDetectionDB'
const DB_VERSION = 5

type StoreName =
  | 'users'
  | 'patients'
  | 'stressRecords'
  | 'heartRateRecords'
  | 'blinkRateRecords'
  | 'fatigueRecords'
  | 'intervalSettings'
  | 'guardianLinks'
  | 'clinicalNotes'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains('users')) {
        const store = db.createObjectStore('users', { keyPath: 'id' })
        store.createIndex('email', 'email', { unique: true })
      }

      if (!db.objectStoreNames.contains('patients')) {
        const store = db.createObjectStore('patients', { keyPath: 'id' })
        store.createIndex('assignedDoctorId', 'assignedDoctorId', { unique: false })
        store.createIndex('assignedNurseId', 'assignedNurseId', { unique: false })
        store.createIndex('email', 'email', { unique: true })
      } else {
        const store = request.transaction!.objectStore('patients')
        if (!store.indexNames.contains('email')) {
          store.createIndex('email', 'email', { unique: true })
        }
      }

      if (!db.objectStoreNames.contains('stressRecords')) {
        const store = db.createObjectStore('stressRecords', { keyPath: 'id' })
        store.createIndex('userId', 'userId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains('heartRateRecords')) {
        const store = db.createObjectStore('heartRateRecords', { keyPath: 'id' })
        store.createIndex('patientId', 'patientId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (db.objectStoreNames.contains('sleepRecords')) {
        db.deleteObjectStore('sleepRecords')
      }

      if (!db.objectStoreNames.contains('blinkRateRecords')) {
        const store = db.createObjectStore('blinkRateRecords', { keyPath: 'id' })
        store.createIndex('patientId', 'patientId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains('fatigueRecords')) {
        const store = db.createObjectStore('fatigueRecords', { keyPath: 'id' })
        store.createIndex('patientId', 'patientId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!db.objectStoreNames.contains('intervalSettings')) {
        const store = db.createObjectStore('intervalSettings', { keyPath: 'id' })
        store.createIndex('patientId', 'patientId', { unique: true })
      }

      if (!db.objectStoreNames.contains('guardianLinks')) {
        const store = db.createObjectStore('guardianLinks', { keyPath: 'id' })
        store.createIndex('guardianId', 'guardianId', { unique: false })
        store.createIndex('patientId', 'patientId', { unique: false })
        store.createIndex('homeUserId', 'homeUserId', { unique: false })
        store.createIndex('shareCode', 'shareCode', { unique: true })
      }

      if (!db.objectStoreNames.contains('clinicalNotes')) {
        const store = db.createObjectStore('clinicalNotes', { keyPath: 'id' })
        store.createIndex('patientId', 'patientId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx<T extends StoreName>(
  db: IDBDatabase,
  store: T,
  mode: IDBTransactionMode = 'readonly',
) {
  return db.transaction(store, mode).objectStore(store)
}

// --- Users ---

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'users')
    const index = store.index('email')
    const req = index.get(email)
    req.onsuccess = () => resolve((req.result as User | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function putUser(user: User): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'users', 'readwrite')
    const req = store.put(user)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// --- Patients ---

export async function getAllPatients(): Promise<Patient[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'patients')
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result as Patient[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

// Authenticate patient by email (case insensitive)
export async function authenticatePatientByEmail(email: string): Promise<Patient | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const patients = await getAllPatients()
  return (
    patients.find((p) => p.email.trim().toLowerCase() === normalized) ?? null
  )
}

export async function putPatient(patient: Patient): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'patients', 'readwrite')
    const req = store.put(patient)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// --- Stress records (only helpers needed now) ---

export async function addStressRecord(record: StressRecord): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'stressRecords', 'readwrite')
    const req = store.add(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// --- Heart rate records ---

export async function saveHeartRateRecord(
  record: Omit<HeartRateRecord, 'id'>,
): Promise<string> {
  const db = await openDb()
  const id = `hr-${record.patientId}-${Date.now()}`
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'heartRateRecords', 'readwrite')
    const req = store.put({ ...record, id })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  return id
}

export async function getHeartRateHistory(
  patientId: string,
  days: number,
): Promise<HeartRateRecord[]> {
  const db = await openDb()
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  return new Promise((resolve, reject) => {
    const store = tx(db, 'heartRateRecords')
    const index = store.index('patientId')
    const req = index.getAll(patientId)
    req.onsuccess = () => {
      const all = (req.result as HeartRateRecord[]) ?? []
      resolve(all.filter((r) => +new Date(r.timestamp) >= since))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getLatestHeartRate(patientId: string): Promise<HeartRateRecord | null> {
  const list = await getHeartRateHistory(patientId, 30)
  if (list.length === 0) return null
  return list.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
}

export async function getAverageHeartRate(
  patientId: string,
  hours: number,
): Promise<number | null> {
  const db = await openDb()
  const since = Date.now() - hours * 60 * 60 * 1000
  return new Promise((resolve, reject) => {
    const store = tx(db, 'heartRateRecords')
    const index = store.index('patientId')
    const req = index.getAll(patientId)
    req.onsuccess = () => {
      const all = (req.result as HeartRateRecord[]) ?? []
      const filtered = all.filter((r) => +new Date(r.timestamp) >= since)
      if (filtered.length === 0) return resolve(null)
      resolve(filtered.reduce((s, r) => s + r.bpm, 0) / filtered.length)
    }
    req.onerror = () => reject(req.error)
  })
}

// --- Blink rate records ---

export async function saveBlinkRateRecord(
  record: Omit<BlinkRateRecord, 'id'>,
): Promise<string> {
  const db = await openDb()
  const id = `blink-${record.patientId}-${Date.now()}`
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'blinkRateRecords', 'readwrite')
    const req = store.put({ ...record, id })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  return id
}

export async function getBlinkRateHistory(
  patientId: string,
  minutes: number,
): Promise<BlinkRateRecord[]> {
  const db = await openDb()
  const since = Date.now() - minutes * 60 * 1000
  return new Promise((resolve, reject) => {
    const store = tx(db, 'blinkRateRecords')
    const index = store.index('patientId')
    const req = index.getAll(patientId)
    req.onsuccess = () => {
      const all = (req.result as BlinkRateRecord[]) ?? []
      resolve(all.filter((r) => +new Date(r.timestamp) >= since))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getLatestBlinkRate(
  patientId: string,
): Promise<BlinkRateRecord | null> {
  const list = await getBlinkRateHistory(patientId, 24 * 60)
  if (list.length === 0) return null
  return list.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
}

export async function getAverageBlinkRate(
  patientId: string,
  minutes: number,
): Promise<number> {
  const list = await getBlinkRateHistory(patientId, minutes)
  if (list.length === 0) return 0
  return list.reduce((s, r) => s + r.blinksPerMinute, 0) / list.length
}

// --- Fatigue records ---

export async function saveFatigueRecord(
  record: Omit<FatigueRecord, 'id'>,
): Promise<string> {
  const db = await openDb()
  const id = `fatigue-${record.patientId}-${Date.now()}`
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'fatigueRecords', 'readwrite')
    const req = store.put({ ...record, id })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  return id
}

export async function getFatigueHistory(
  patientId: string,
  hours: number,
): Promise<FatigueRecord[]> {
  const db = await openDb()
  const since = Date.now() - hours * 60 * 60 * 1000
  return new Promise((resolve, reject) => {
    const store = tx(db, 'fatigueRecords')
    const index = store.index('patientId')
    const req = index.getAll(patientId)
    req.onsuccess = () => {
      const all = (req.result as FatigueRecord[]) ?? []
      resolve(all.filter((r) => +new Date(r.timestamp) >= since))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getLatestFatigue(
  patientId: string,
): Promise<FatigueRecord | null> {
  const list = await getFatigueHistory(patientId, 24)
  if (list.length === 0) return null
  return list.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
}

export async function getPatientVitalsSummary(patientId: string): Promise<{
  latestStress: StressRecord | null
  latestHeartRate: HeartRateRecord | null
  latestBlinkRate: BlinkRateRecord | null
  latestFatigue: FatigueRecord | null
  sevenDayStressAvg: number
  sevenDayHeartRateAvg: number
  averageBlinkRate: number
  fatigueTrend: 'improving' | 'declining' | 'stable'
  heartRateTrend: 'increasing' | 'decreasing' | 'stable'
}> {
  const [weekStress, weekHr, blink60, fat24] = await Promise.all([
    getStressHistory(patientId, 7),
    getHeartRateHistory(patientId, 7),
    getBlinkRateHistory(patientId, 60),
    getFatigueHistory(patientId, 24),
  ])

  const stressComplete = weekStress.filter((r) => r.status !== 'missed')
  const sevenDayStressAvg =
    stressComplete.length === 0
      ? 0
      : stressComplete.reduce((s, r) => s + r.score, 0) / stressComplete.length

  const sevenDayHeartRateAvg =
    weekHr.length === 0 ? 0 : weekHr.reduce((s, r) => s + r.bpm, 0) / weekHr.length

  const averageBlinkRate =
    blink60.length === 0
      ? 0
      : blink60.reduce((s, r) => s + r.blinksPerMinute, 0) / blink60.length

  const latestStress =
    weekStress.length === 0
      ? null
      : weekStress.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
  const latestHeartRate =
    weekHr.length === 0
      ? null
      : weekHr.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
  const latestBlinkRate =
    blink60.length === 0
      ? null
      : blink60.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
  const latestFatigue =
    fat24.length === 0
      ? null
      : fat24.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!

  const sortedFat = fat24.slice().sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  const fmid = Math.floor(sortedFat.length / 2)
  const f1 = sortedFat.slice(0, fmid)
  const f2 = sortedFat.slice(fmid)
  const avgF1 = f1.length === 0 ? 0 : f1.reduce((s, r) => s + r.score, 0) / f1.length
  const avgF2 = f2.length === 0 ? 0 : f2.reduce((s, r) => s + r.score, 0) / f2.length
  const fatigueTrend =
    Math.abs(avgF2 - avgF1) < 2 ? 'stable' : avgF2 < avgF1 ? 'improving' : 'declining'

  const sortedHr = weekHr.slice().sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  const hrMid = Math.floor(sortedHr.length / 2)
  const hr1 = sortedHr.slice(0, hrMid)
  const hr2 = sortedHr.slice(hrMid)
  const avgHr1 = hr1.length === 0 ? 0 : hr1.reduce((s, r) => s + r.bpm, 0) / hr1.length
  const avgHr2 = hr2.length === 0 ? 0 : hr2.reduce((s, r) => s + r.bpm, 0) / hr2.length
  const heartRateTrend =
    Math.abs(avgHr2 - avgHr1) < 2 ? 'stable' : avgHr2 > avgHr1 ? 'increasing' : 'decreasing'

  return {
    latestStress,
    latestHeartRate,
    latestBlinkRate,
    latestFatigue,
    sevenDayStressAvg,
    sevenDayHeartRateAvg,
    averageBlinkRate,
    fatigueTrend,
    heartRateTrend,
  }
}

export async function savePatientStressRecord(
  record: Omit<StressRecord, 'id'>,
): Promise<string> {
  const id = `rec-${record.userId}-${Date.now()}`
  await addStressRecord({ ...record, id })

  // Update lastCheckIn on patient for scheduling accuracy
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'patients', 'readwrite')
    const getReq = store.get(record.userId)
    getReq.onsuccess = () => {
      const patient = getReq.result as Patient
      patient.lastCheckIn = new Date(record.timestamp)
      const putReq = store.put(patient)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })

  return id
}

export async function getStressHistory(
  userId: string,
  days: number,
): Promise<StressRecord[]> {
  const db = await openDb()
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  return new Promise((resolve, reject) => {
    const store = tx(db, 'stressRecords')
    const index = store.index('userId')
    const req = index.getAll(userId)
    req.onsuccess = () => {
      const all = (req.result as StressRecord[]) ?? []
      const filtered = all.filter((r) => new Date(r.timestamp).getTime() >= since)
      resolve(filtered)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getPatientCareTeam(patientId: string): Promise<{
  doctor: { id: string; name: string; email: string }
  nurse: { id: string; name: string; email: string }
}> {
  const db = await openDb()
  const patient = await new Promise<Patient>((resolve, reject) => {
    const store = tx(db, 'patients')
    const req = store.get(patientId)
    req.onsuccess = () => resolve(req.result as Patient)
    req.onerror = () => reject(req.error)
  })

  const getUser = (id: string) =>
    new Promise<User | null>((resolve, reject) => {
      const store = tx(db, 'users')
      const req = store.get(id)
      req.onsuccess = () => resolve((req.result as User | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })

  const [doc, nurse] = await Promise.all([
    getUser(patient.assignedDoctorId),
    getUser(patient.assignedNurseId),
  ])

  return {
    doctor: {
      id: patient.assignedDoctorId,
      name: doc?.name ?? patient.doctorName,
      email: doc?.email ?? '',
    },
    nurse: {
      id: patient.assignedNurseId,
      name: nurse?.name ?? patient.nurseName,
      email: nurse?.email ?? '',
    },
  }
}

export async function getPatientInterval(patientId: string): Promise<{
  intervalMinutes: number
  lastModifiedBy: string
  lastModifiedAt: Date
  reason?: string
}> {
  const [patient, settings] = await Promise.all([
    (async () => {
      const db = await openDb()
      return new Promise<Patient>((resolve, reject) => {
        const store = tx(db, 'patients')
        const req = store.get(patientId)
        req.onsuccess = () => resolve(req.result as Patient)
        req.onerror = () => reject(req.error)
      })
    })(),
    getIntervalSettingsForPatient(patientId),
  ])

  return {
    intervalMinutes: patient.intervalMinutes,
    lastModifiedBy: settings?.lastModifiedBy ?? patient.assignedDoctorId,
    lastModifiedAt: settings?.lastModifiedAt ?? new Date(patient.admissionDate),
    reason: settings?.reasonForChange,
  }
}

export async function getPatientDashboardData(patientId: string): Promise<{
  patient: Patient
  latestStressRecord: StressRecord | null
  todayStressRecords: StressRecord[]
  weekStressRecords: StressRecord[]
  nextScheduledCheck: Date
  careTeam: {
    doctorName: string
    doctorId: string
    nurseName: string
    nurseId: string
  }
}> {
  const db = await openDb()
  const patient = await new Promise<Patient>((resolve, reject) => {
    const store = tx(db, 'patients')
    const req = store.get(patientId)
    req.onsuccess = () => resolve(req.result as Patient)
    req.onerror = () => reject(req.error)
  })

  const weekStressRecords = await getStressHistory(patientId, 7)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const todayStressRecords = weekStressRecords
    .filter((r) => +new Date(r.timestamp) >= startOfDay.getTime())
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))

  const latestStressRecord =
    weekStressRecords.length === 0
      ? null
      : weekStressRecords
          .slice()
          .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!

  const nextScheduledCheck = new Date(
    +new Date(patient.lastCheckIn) + patient.intervalMinutes * 60000,
  )

  return {
    patient,
    latestStressRecord,
    todayStressRecords,
    weekStressRecords,
    nextScheduledCheck,
    careTeam: {
      doctorName: patient.doctorName,
      doctorId: patient.assignedDoctorId,
      nurseName: patient.nurseName,
      nurseId: patient.assignedNurseId,
    },
  }
}

export async function markPatientCheckMissed(
  patientId: string,
  dueAt: Date,
): Promise<void> {
  const record: Omit<StressRecord, 'id'> = {
    userId: patientId,
    timestamp: dueAt,
    score: 0,
    level: 'Low',
    faceConfidence: 0,
    audioConfidence: 0,
    sessionDuration: 0,
    status: 'missed',
  }
  await savePatientStressRecord(record)
}

// --- Interval settings (basic get/set) ---

export async function getIntervalSettingsForPatient(
  patientId: string,
): Promise<IntervalSettings | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'intervalSettings')
    const index = store.index('patientId')
    const req = index.get(patientId)
    req.onsuccess = () => resolve((req.result as IntervalSettings | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function putIntervalSettings(settings: IntervalSettings): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'intervalSettings', 'readwrite')
    const req = store.put(settings)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// --- Guardians (minimal helpers for now) ---

export async function putGuardianLink(link: GuardianLink): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'guardianLinks', 'readwrite')
    const req = store.put(link)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

async function getAllGuardianLinks(): Promise<GuardianLink[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'guardianLinks')
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result as GuardianLink[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function addGuardianLink(link: Omit<GuardianLink, 'id'>): Promise<string> {
  const id = `link-${link.patientId}-${Date.now()}`
  await putGuardianLink({ ...link, id })
  return id
}

export async function getGuardianLinkByCode(shareCode: string): Promise<GuardianLink | null> {
  const code = shareCode.trim().toUpperCase()
  if (!code) return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'guardianLinks')
    const index = store.index('shareCode')
    const req = index.get(code)
    req.onsuccess = () => resolve((req.result as GuardianLink | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function updateGuardianLink(code: string, guardianId: string): Promise<void> {
  const link = await getGuardianLinkByCode(code)
  if (!link) throw new Error('Guardian link not found')
  const updated: GuardianLink = { ...link, guardianId }
  await putGuardianLink(updated)
}

export async function getGuardianByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const user = await getUserByEmail(normalized)
  if (!user || user.mode !== 'hospital' || user.role !== 'guardian') return null
  return user
}

export async function createGuardian(guardian: Omit<User, 'id'>): Promise<User> {
  const id = `guardian-${Date.now()}`
  const user: User = { ...guardian, id }
  await putUser(user)
  return user
}

export async function verifyGuardianAccess(
  guardianId: string,
  patientId: string,
): Promise<boolean> {
  const links = await getAllGuardianLinks()
  return links.some((l) => l.patientId === patientId && l.guardianId === guardianId)
}

function startOfDayMsFor(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export async function getGuardianStats(patientId: string): Promise<{
  todayTotalChecks: number
  completedChecks: number
  missedChecks: number
  averageStress: number
  highestStress: { score: number; time: Date } | null
  lowestStress: { score: number; time: Date } | null
}> {
  const week = await getStressHistory(patientId, 7)
  const start = startOfDayMsFor(new Date())
  const today = week.filter((r) => +new Date(r.timestamp) >= start)
  const completed = today.filter((r) => r.status !== 'missed')
  const missed = today.filter((r) => r.status === 'missed')
  const avg =
    completed.length === 0 ? 0 : completed.reduce((s, r) => s + r.score, 0) / completed.length
  const highest =
    completed.length === 0
      ? null
      : completed.reduce((best, r) => (r.score > best.score ? r : best), completed[0]!)
  const lowest =
    completed.length === 0
      ? null
      : completed.reduce((best, r) => (r.score < best.score ? r : best), completed[0]!)

  return {
    todayTotalChecks: today.length,
    completedChecks: completed.length,
    missedChecks: missed.length,
    averageStress: avg,
    highestStress: highest ? { score: highest.score, time: new Date(highest.timestamp) } : null,
    lowestStress: lowest ? { score: lowest.score, time: new Date(lowest.timestamp) } : null,
  }
}

export async function getWeeklySummary(patientId: string): Promise<{
  dailyAverages: { day: string; score: number; level: string }[]
  weeklyAverage: number
  trend: number
  latestNoteFromCareTeam?: string
}> {
  const week = await getStressHistory(patientId, 7)
  const completed = week.filter((r) => r.status !== 'missed')
  const byDay = new Map<string, StressRecord[]>()
  for (const r of completed) {
    const d = new Date(r.timestamp)
    const key = d.toLocaleDateString([], { weekday: 'short' })
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(r)
  }
  const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dailyAverages = daysOrder
    .filter((d) => byDay.has(d))
    .map((d) => {
      const list = byDay.get(d)!
      const avg = list.reduce((s, r) => s + r.score, 0) / list.length
      const level = avg <= 33 ? 'Low' : avg <= 66 ? 'Medium' : 'High'
      return { day: d, score: avg, level }
    })

  const weeklyAverage =
    completed.length === 0 ? 0 : completed.reduce((s, r) => s + r.score, 0) / completed.length

  // Trend: compare last 3 days vs prior 3 days (simple demo heuristic)
  const sorted = completed.slice().sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
  const last3 = sorted.slice(-Math.min(3, sorted.length))
  const prev3 = sorted.slice(-Math.min(6, sorted.length), -Math.min(3, sorted.length))
  const avgLast3 = last3.length === 0 ? 0 : last3.reduce((s, r) => s + r.score, 0) / last3.length
  const avgPrev3 = prev3.length === 0 ? avgLast3 : prev3.reduce((s, r) => s + r.score, 0) / prev3.length
  const trend = avgLast3 - avgPrev3

  const notes = await getClinicalNotes(patientId)
  const latest = notes.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]

  return {
    dailyAverages,
    weeklyAverage,
    trend,
    latestNoteFromCareTeam: latest ? `"${latest.text}" — ${latest.authorName}` : undefined,
  }
}

export async function getPatientForGuardian(
  patientId: string,
  guardianId: string,
): Promise<{
  patient: Patient
  latestStressRecord: StressRecord | null
  todayStressRecords: StressRecord[]
  weekStressRecords: StressRecord[]
  nextScheduledCheck: Date
  careTeam: {
    doctorName: string
    doctorId: string
    doctorContact?: string
    nurseName: string
    nurseId: string
    nurseContact?: string
  }
  adherenceRate: number
  weeklyAverage: number
  weeklyTrend: number
  recentVitals: { heartRate: number; bloodPressure: string; respiration: number }
}> {
  const ok = await verifyGuardianAccess(guardianId, patientId)
  if (!ok) throw new Error('Access denied')

  const [dash, weekly] = await Promise.all([
    getPatientDashboardData(patientId),
    getWeeklySummary(patientId),
  ])

  const today = dash.todayStressRecords
  const completed = today.filter((r) => r.status !== 'missed').length
  const missed = today.filter((r) => r.status === 'missed').length
  const adherenceRate =
    completed + missed === 0 ? 0 : Math.round((completed / (completed + missed)) * 100)

  const recentVitals = {
    heartRate: 72,
    bloodPressure: '118/76',
    respiration: 16,
  }

  return {
    patient: dash.patient,
    latestStressRecord: dash.latestStressRecord,
    todayStressRecords: dash.todayStressRecords,
    weekStressRecords: dash.weekStressRecords,
    nextScheduledCheck: dash.nextScheduledCheck,
    careTeam: {
      doctorName: dash.careTeam.doctorName,
      doctorId: dash.careTeam.doctorId,
      doctorContact: 'ext. 1234',
      nurseName: dash.careTeam.nurseName,
      nurseId: dash.careTeam.nurseId,
      nurseContact: 'ext. 5678',
    },
    adherenceRate,
    weeklyAverage: weekly.weeklyAverage,
    weeklyTrend: weekly.trend,
    recentVitals,
  }
}

// --- Clinical notes ---

export interface PatientWithLatestStress extends Patient {
  latestRecord: StressRecord | null
  latestHeartRate: HeartRateRecord | null
  latestBlinkRate: BlinkRateRecord | null
  latestFatigue: FatigueRecord | null
}

export interface PatientDetails extends Patient {
  records: StressRecord[]
  notes: ClinicalNote[]
}

export interface DoctorStats {
  totalPatients: number
  criticalPatients: number
  todaysCheckins: number
  todaysAvgStress: number
}

export interface NurseStats {
  assignedPatients: number
  criticalPatients: number
  todaysCheckins: number
  overdueChecks: number
}

export async function addClinicalNote(note: ClinicalNote): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'clinicalNotes', 'readwrite')
    const req = store.put(note)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getClinicalNotes(patientId: string): Promise<ClinicalNote[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'clinicalNotes')
    const index = store.index('patientId')
    const req = index.getAll(patientId)
    req.onsuccess = () => resolve((req.result as ClinicalNote[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

// --- Doctor helpers ---

async function getAllStressRecords(): Promise<StressRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'stressRecords')
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result as StressRecord[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function getAllPatientsWithLatestStress(): Promise<PatientWithLatestStress[]> {
  const [patients, records] = await Promise.all([getAllPatients(), getAllStressRecords()])
  const grouped = new Map<string, StressRecord[]>()
  for (const r of records) {
    if (!grouped.has(r.userId)) grouped.set(r.userId, [])
    grouped.get(r.userId)!.push(r)
  }
  const [allHr, allBlink, allFatigue] = await Promise.all([
    (async () => {
      const db = await openDb()
      return new Promise<HeartRateRecord[]>((resolve, reject) => {
        const store = tx(db, 'heartRateRecords')
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result as HeartRateRecord[]) ?? [])
        req.onerror = () => reject(req.error)
      })
    })(),
    (async () => {
      const db = await openDb()
      return new Promise<BlinkRateRecord[]>((resolve, reject) => {
        const store = tx(db, 'blinkRateRecords')
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result as BlinkRateRecord[]) ?? [])
        req.onerror = () => reject(req.error)
      })
    })(),
    (async () => {
      const db = await openDb()
      return new Promise<FatigueRecord[]>((resolve, reject) => {
        const store = tx(db, 'fatigueRecords')
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result as FatigueRecord[]) ?? [])
        req.onerror = () => reject(req.error)
      })
    })(),
  ])
  const hrByPatient = new Map<string, HeartRateRecord[]>()
  for (const r of allHr) {
    if (!hrByPatient.has(r.patientId)) hrByPatient.set(r.patientId, [])
    hrByPatient.get(r.patientId)!.push(r)
  }
  const blinkByPatient = new Map<string, BlinkRateRecord[]>()
  for (const r of allBlink) {
    if (!blinkByPatient.has(r.patientId)) blinkByPatient.set(r.patientId, [])
    blinkByPatient.get(r.patientId)!.push(r)
  }
  const fatigueByPatient = new Map<string, FatigueRecord[]>()
  for (const r of allFatigue) {
    if (!fatigueByPatient.has(r.patientId)) fatigueByPatient.set(r.patientId, [])
    fatigueByPatient.get(r.patientId)!.push(r)
  }

  return patients.map((p) => {
    const list = grouped.get(p.id) ?? []
    const latest =
      list.length === 0
        ? null
        : list.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!

    const hrList = hrByPatient.get(p.id) ?? []
    const latestHeartRate =
      hrList.length === 0
        ? null
        : hrList.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!

    const bList = blinkByPatient.get(p.id) ?? []
    const latestBlinkRate =
      bList.length === 0
        ? null
        : bList.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!

    const fList = fatigueByPatient.get(p.id) ?? []
    const latestFatigue =
      fList.length === 0
        ? null
        : fList.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!

    return { ...p, latestRecord: latest, latestHeartRate, latestBlinkRate, latestFatigue }
  })
}

// --- Nurse helpers ---

async function getPatientsByIndex(indexName: 'assignedDoctorId' | 'assignedNurseId', id: string) {
  const db = await openDb()
  return new Promise<Patient[]>((resolve, reject) => {
    const store = tx(db, 'patients')
    const index = store.index(indexName)
    const req = index.getAll(id)
    req.onsuccess = () => resolve((req.result as Patient[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function getPatientsByNurseId(nurseId: string): Promise<PatientWithLatestStress[]> {
  const [patients, records, hrAll, blinkAll, fatigueAll] = await Promise.all([
    getPatientsByIndex('assignedNurseId', nurseId),
    getAllStressRecords(),
    (async () => {
      const db = await openDb()
      return new Promise<HeartRateRecord[]>((resolve, reject) => {
        const store = tx(db, 'heartRateRecords')
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result as HeartRateRecord[]) ?? [])
        req.onerror = () => reject(req.error)
      })
    })(),
    (async () => {
      const db = await openDb()
      return new Promise<BlinkRateRecord[]>((resolve, reject) => {
        const store = tx(db, 'blinkRateRecords')
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result as BlinkRateRecord[]) ?? [])
        req.onerror = () => reject(req.error)
      })
    })(),
    (async () => {
      const db = await openDb()
      return new Promise<FatigueRecord[]>((resolve, reject) => {
        const store = tx(db, 'fatigueRecords')
        const req = store.getAll()
        req.onsuccess = () => resolve((req.result as FatigueRecord[]) ?? [])
        req.onerror = () => reject(req.error)
      })
    })(),
  ])
  const byUser = new Map<string, StressRecord[]>()
  for (const r of records) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, [])
    byUser.get(r.userId)!.push(r)
  }
  const hrByPatient = new Map<string, HeartRateRecord[]>()
  for (const r of hrAll) {
    if (!hrByPatient.has(r.patientId)) hrByPatient.set(r.patientId, [])
    hrByPatient.get(r.patientId)!.push(r)
  }
  const blinkByPatient = new Map<string, BlinkRateRecord[]>()
  for (const r of blinkAll) {
    if (!blinkByPatient.has(r.patientId)) blinkByPatient.set(r.patientId, [])
    blinkByPatient.get(r.patientId)!.push(r)
  }
  const fatigueByPatient = new Map<string, FatigueRecord[]>()
  for (const r of fatigueAll) {
    if (!fatigueByPatient.has(r.patientId)) fatigueByPatient.set(r.patientId, [])
    fatigueByPatient.get(r.patientId)!.push(r)
  }

  return patients.map((p) => {
    const list = byUser.get(p.id) ?? []
    const latest =
      list.length === 0
        ? null
        : list.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
    const hrList = hrByPatient.get(p.id) ?? []
    const latestHeartRate =
      hrList.length === 0
        ? null
        : hrList.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
    const bList = blinkByPatient.get(p.id) ?? []
    const latestBlinkRate =
      bList.length === 0
        ? null
        : bList.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
    const fList = fatigueByPatient.get(p.id) ?? []
    const latestFatigue =
      fList.length === 0
        ? null
        : fList.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]!
    return { ...p, latestRecord: latest, latestHeartRate, latestBlinkRate, latestFatigue }
  })
}

function startOfTodayMs() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function isOverduePatient(
  patient: PatientWithLatestStress,
  graceMinutes = 5,
): boolean {
  const lastCheck = +new Date(patient.lastCheckIn)
  const nextDue = lastCheck + patient.intervalMinutes * 60000
  const now = Date.now()
  if (now <= nextDue + graceMinutes * 60000) return false

  // If we have a stress record after nextDue, treat as checked in.
  const latest = patient.latestRecord
  if (latest && +new Date(latest.timestamp) >= nextDue) return false
  return true
}

export async function getOverdueChecks(nurseId: string): Promise<PatientWithLatestStress[]> {
  const patients = await getPatientsByNurseId(nurseId)
  return patients.filter((p) => isOverduePatient(p, 5))
}

export async function getNurseStats(nurseId: string): Promise<NurseStats> {
  const [patients, records] = await Promise.all([
    getPatientsByNurseId(nurseId),
    getAllStressRecords(),
  ])
  const assignedPatients = patients.length
  const criticalPatients = patients.filter((p) => p.severity === 'high').length

  const startDay = startOfTodayMs()
  const patientIds = new Set(patients.map((p) => p.id))
  const todaysCheckins = records.filter(
    (r) => patientIds.has(r.userId) && +new Date(r.timestamp) >= startDay,
  ).length

  const overdueChecks = patients.filter((p) => isOverduePatient(p, 5)).length
  return { assignedPatients, criticalPatients, todaysCheckins, overdueChecks }
}

export async function getPatientDetailsForNurse(
  patientId: string,
  days = 7,
): Promise<{
  patient: Patient
  stressRecords: StressRecord[]
  intervalSettings: IntervalSettings[]
  clinicalNotes: ClinicalNote[]
}> {
  const db = await openDb()
  const patient = await new Promise<Patient>((resolve, reject) => {
    const store = tx(db, 'patients')
    const req = store.get(patientId)
    req.onsuccess = () => resolve(req.result as Patient)
    req.onerror = () => reject(req.error)
  })

  const [stressRecords, clinicalNotes, interval] = await Promise.all([
    getStressHistory(patientId, days),
    getClinicalNotes(patientId),
    getIntervalSettingsForPatient(patientId),
  ])

  return {
    patient,
    stressRecords,
    intervalSettings: interval ? [interval] : [],
    clinicalNotes,
  }
}

export async function addNursingNote(
  patientId: string,
  noteText: string,
  nurseId: string,
  nurseName: string,
): Promise<void> {
  const note: ClinicalNote = {
    id: `note-${patientId}-${Date.now()}`,
    patientId,
    authorId: nurseId,
    authorName: nurseName,
    role: 'nurse',
    text: noteText.trim(),
    createdAt: new Date(),
  }
  await addClinicalNote(note)
}

export async function getPatientFullDetails(
  patientId: string,
  days: number,
): Promise<PatientDetails> {
  const db = await openDb()
  const patient = await new Promise<Patient>((resolve, reject) => {
    const store = tx(db, 'patients')
    const req = store.get(patientId)
    req.onsuccess = () => resolve(req.result as Patient)
    req.onerror = () => reject(req.error)
  })
  const [records, notes] = await Promise.all([
    getStressHistory(patientId, days),
    getClinicalNotes(patientId),
  ])
  return { ...patient, records, notes }
}

export async function updatePatientInterval(
  patientId: string,
  intervalMinutes: number,
  reason: string,
  modifiedByUserId: string,
): Promise<void> {
  const db = await openDb()
  const patientStore = tx(db, 'patients', 'readwrite')
  const getReq = patientStore.get(patientId)
  const now = new Date()
  await new Promise<void>((resolve, reject) => {
    getReq.onsuccess = () => {
      const patient = getReq.result as Patient
      patient.intervalMinutes = intervalMinutes
      const putReq = patientStore.put(patient)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })

  const existing = await getIntervalSettingsForPatient(patientId)
  const settings: IntervalSettings = {
    id: existing?.id ?? `interval-${patientId}`,
    patientId,
    intervalMinutes,
    lastModifiedBy: modifiedByUserId,
    lastModifiedAt: now,
    reasonForChange: reason || existing?.reasonForChange,
  }
  await putIntervalSettings(settings)
}

export async function getDoctorStats(): Promise<DoctorStats> {
  const [patients, records] = await Promise.all([getAllPatients(), getAllStressRecords()])
  const totalPatients = patients.length
  const criticalPatients = patients.filter((p) => p.severity === 'high').length

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const todays = records.filter(
    (r) => new Date(r.timestamp).getTime() >= startOfDay.getTime(),
  )
  const todaysCheckins = todays.length
  const todaysAvgStress =
    todays.length === 0
      ? 0
      : todays.reduce((sum, r) => sum + r.score, 0) / todays.length

  return { totalPatients, criticalPatients, todaysCheckins, todaysAvgStress }
}

// --- Seed mock data once per browser ---

const SEED_KEY_V1 = 'silentvitals.seededV1'
const SEED_KEY = 'silentvitals.seededV2'

async function repairPatientEmailsIfNeeded(): Promise<void> {
  const patients = await getAllPatients()
  const needsRepair = patients.some((p) => /@hospital\.test$/i.test(p.email))
  if (!needsRepair) return

  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'patients', 'readwrite')
    const req = store.getAll()
    req.onsuccess = () => {
      const list = (req.result as Patient[]) ?? []
      const updates = list.filter((p) => /@hospital\.test$/i.test(p.email))
      for (const p of updates) {
        p.email = p.email.replace(/@hospital\.test$/i, '@example.com')
        store.put(p)
      }
      resolve()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function seedMockDataIfNeeded(): Promise<void> {
  // If old seed exists, repair common mismatches (like email domain) and mark upgraded.
  if (localStorage.getItem(SEED_KEY)) return
  if (localStorage.getItem(SEED_KEY_V1)) {
    await repairPatientEmailsIfNeeded()
    localStorage.setItem(SEED_KEY, '1')
    return
  }

  const demoDoctor: User = {
    id: 'doctor-1',
    email: 'dr.sarah.wilson@hospital.test',
    role: 'doctor',
    mode: 'hospital',
    name: 'Dr. Sarah Wilson',
    createdAt: new Date(),
  }

  const demoNurse1: User = {
    id: 'nurse-1',
    email: 'nurse.jennifer.lee@hospital.test',
    role: 'nurse',
    mode: 'hospital',
    name: 'Nurse Jennifer Lee',
    createdAt: new Date(),
  }

  const demoNurse2: User = {
    id: 'nurse-2',
    email: 'nurse.michael.chen@hospital.test',
    role: 'nurse',
    mode: 'hospital',
    name: 'Nurse Michael Chen',
    createdAt: new Date(),
  }

  const now = Date.now()

  const basePatients: Patient[] = [
    {
      id: 'patient-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 54,
      roomNumber: '101',
      bedNumber: 'A',
      diagnosis: 'Post-surgical recovery',
      severity: 'high',
      intervalMinutes: 15,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse1.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse1.name,
      admissionDate: new Date(now - 3 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 22 * 60 * 1000),
      stressHistory: [],
    },
    {
      id: 'patient-2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      age: 47,
      roomNumber: '102',
      bedNumber: 'B',
      diagnosis: 'Hypertension',
      severity: 'high',
      intervalMinutes: 15,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse1.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse1.name,
      admissionDate: new Date(now - 5 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 42 * 60 * 1000),
      stressHistory: [],
    },
    {
      id: 'patient-3',
      name: 'Amir Patel',
      email: 'amir.patel@example.com',
      age: 62,
      roomNumber: '103',
      bedNumber: 'A',
      diagnosis: 'COPD exacerbation',
      severity: 'medium',
      intervalMinutes: 30,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse1.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse1.name,
      admissionDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 9 * 60 * 1000),
      stressHistory: [],
    },
    {
      id: 'patient-4',
      name: 'Lina Gomez',
      email: 'lina.gomez@example.com',
      age: 39,
      roomNumber: '104',
      bedNumber: 'C',
      diagnosis: 'Pneumonia',
      severity: 'low',
      intervalMinutes: 45,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse1.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse1.name,
      admissionDate: new Date(now - 6 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 38 * 60 * 1000),
      stressHistory: [],
    },
    {
      id: 'patient-5',
      name: 'Noah Williams',
      email: 'noah.williams@example.com',
      age: 58,
      roomNumber: '201',
      bedNumber: 'A',
      diagnosis: 'Cardiac monitoring',
      severity: 'medium',
      intervalMinutes: 20,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse2.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse2.name,
      admissionDate: new Date(now - 4 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 16 * 60 * 1000),
      stressHistory: [],
    },
    {
      id: 'patient-6',
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      age: 29,
      roomNumber: '202',
      bedNumber: 'B',
      diagnosis: 'Migraine management',
      severity: 'low',
      intervalMinutes: 60,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse2.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse2.name,
      admissionDate: new Date(now - 1 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 52 * 60 * 1000),
      stressHistory: [],
    },
    {
      id: 'patient-7',
      name: 'Ethan Brown',
      email: 'ethan.brown@example.com',
      age: 44,
      roomNumber: '203',
      bedNumber: 'A',
      diagnosis: 'Anxiety observation',
      severity: 'high',
      intervalMinutes: 15,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse2.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse2.name,
      admissionDate: new Date(now - 7 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 64 * 60 * 1000),
      stressHistory: [],
    },
    {
      id: 'patient-8',
      name: 'Sophia Kim',
      email: 'sophia.kim@example.com',
      age: 33,
      roomNumber: '204',
      bedNumber: 'D',
      diagnosis: 'Diabetes management',
      severity: 'medium',
      intervalMinutes: 30,
      assignedDoctorId: demoDoctor.id,
      assignedNurseId: demoNurse2.id,
      doctorName: demoDoctor.name,
      nurseName: demoNurse2.name,
      admissionDate: new Date(now - 8 * 24 * 60 * 60 * 1000),
      lastCheckIn: new Date(now - 27 * 60 * 1000),
      stressHistory: [],
    },
  ]

  await putUser(demoDoctor)
  await putUser(demoNurse1)
  await putUser(demoNurse2)
  await Promise.all(basePatients.map((p) => putPatient(p)))

  // Seed guardians + guardian links (access codes)
  const guardian1: User = {
    id: 'guardian-1',
    name: 'Mary Doe',
    email: 'mary.doe@family.com',
    role: 'guardian',
    mode: 'hospital',
    createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
  }
  const guardian2: User = {
    id: 'guardian-2',
    name: 'Robert Smith',
    email: 'robert.smith@family.com',
    role: 'guardian',
    mode: 'hospital',
    createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000),
  }
  await putUser(guardian1)
  await putUser(guardian2)

  await putGuardianLink({
    id: 'link-1',
    patientId: 'patient-1',
    patientName: 'John Doe',
    guardianId: guardian1.id,
    shareCode: 'PAT-ABC123',
    relationship: 'Mother',
    createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
    createdBy: demoDoctor.id,
  })

  await putGuardianLink({
    id: 'link-2',
    patientId: 'patient-2',
    patientName: 'Jane Smith',
    shareCode: 'PAT-DEF456',
    relationship: 'Husband',
    createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000),
    createdBy: demoDoctor.id,
  })

  // Seed interval settings with change history
  for (const p of basePatients) {
    const reason =
      p.severity === 'high'
        ? 'Increased anxiety'
        : p.severity === 'medium'
        ? 'Routine monitoring'
        : 'Stable vitals'
    const settings: IntervalSettings = {
      id: `interval-${p.id}`,
      patientId: p.id,
      intervalMinutes: p.intervalMinutes,
      lastModifiedBy: demoDoctor.id,
      lastModifiedAt: new Date(now - (2 + (p.id.charCodeAt(p.id.length - 1) % 3)) * 60 * 60 * 1000),
      reasonForChange: reason,
    }
    // eslint-disable-next-line no-await-in-loop
    await putIntervalSettings(settings)
  }

  // Seed realistic stress history for the last 7 days per patient
  for (const p of basePatients) {
    const base =
      p.severity === 'high' ? 68 : p.severity === 'medium' ? 48 : 28
    for (let day = 0; day < 7; day++) {
      // 6 check-ins per day: morning peak, midday, afternoon, evening low
      const dayStart = now - day * 24 * 60 * 60 * 1000
      const offsets = [8, 10, 12, 15, 18, 21] // hours
      for (let i = 0; i < offsets.length; i++) {
        const hour = offsets[i]!
        const ts = new Date(dayStart)
        ts.setHours(hour, 0, 0, 0)
        // Peaks in morning, lows in evening
        const wave = i <= 1 ? 10 : i === 2 ? 6 : i === 3 ? 4 : i === 4 ? -2 : -6
        const jitter = ((p.id.charCodeAt(0) + day * 13 + i * 7) % 7) - 3
        const raw = base + wave + jitter
        const score = Math.max(5, Math.min(95, raw))
        const record: StressRecord = {
          id: `${p.id}-rec-${day}-${i}`,
          userId: p.id,
          timestamp: ts,
          score,
          level: score < 34 ? 'Low' : score <= 66 ? 'Medium' : 'High',
          faceConfidence: 0.72 + (((day + i) % 5) * 0.05),
          audioConfidence: 0.7 + (((day + i + 2) % 5) * 0.05),
          sessionDuration: 15,
        }
        // eslint-disable-next-line no-await-in-loop
        await addStressRecord(record)
      }
    }
  }

  // Seed a couple of notes per patient (doctor + nurse)
  for (const p of basePatients) {
    const nurse =
      p.assignedNurseId === demoNurse1.id ? demoNurse1 : demoNurse2
    const doctorNote: ClinicalNote = {
      id: `note-${p.id}-doctor`,
      patientId: p.id,
      authorId: demoDoctor.id,
      authorName: demoDoctor.name,
      role: 'doctor',
      text:
        p.severity === 'high'
          ? 'Monitor closely; consider medication adjustment if stress remains elevated.'
          : 'Continue current plan of care.',
      createdAt: new Date(now - 6 * 60 * 60 * 1000),
    }
    const nurseNote: ClinicalNote = {
      id: `note-${p.id}-nurse`,
      patientId: p.id,
      authorId: nurse.id,
      authorName: nurse.name,
      role: 'nurse',
      text: 'Patient appears calm. Vitals stable. Provided reassurance and hydration.',
      createdAt: new Date(now - 2 * 60 * 60 * 1000),
    }
    // eslint-disable-next-line no-await-in-loop
    await addClinicalNote(doctorNote)
    // eslint-disable-next-line no-await-in-loop
    await addClinicalNote(nurseNote)
  }

  // Seed heart rate history (last 7 days, ~2 per day)
  for (const p of basePatients) {
    const baseHr = 70 + (p.severity === 'high' ? 10 : p.severity === 'medium' ? 5 : 0)
    for (let i = 0; i < 14; i++) {
      const ts = new Date(now - i * 12 * 60 * 60 * 1000)
      const hour = ts.getHours()
      const isDay = hour >= 8 && hour <= 20
      const jitter = ((p.id.charCodeAt(0) + i * 7) % 15) - 7
      const bpm = Math.max(55, Math.min(120, baseHr + jitter + (isDay ? 5 : -5)))
      const rec: Omit<HeartRateRecord, 'id'> = {
        patientId: p.id,
        timestamp: ts,
        bpm,
        source: 'camera',
        confidence: 70 + (((i + p.id.length) % 25) as number),
        context: i % 5 === 0 ? 'stressed' : 'resting',
      }
      // eslint-disable-next-line no-await-in-loop
      await saveHeartRateRecord(rec)
    }
  }

  // Seed blink rate + fatigue history (last 24 hours, hourly)
  for (const p of basePatients) {
    const baseBlink = 14 + (p.severity === 'high' ? 4 : p.severity === 'medium' ? 2 : 0)
    for (let i = 0; i < 24; i++) {
      const ts = new Date(now - i * 60 * 60 * 1000)
      const hour = ts.getHours()
      const night = hour >= 22 || hour <= 6
      const slump = hour >= 13 && hour <= 15
      const morning = hour >= 9 && hour <= 11
      const variation = night ? 10 : slump ? 5 : morning ? -2 : 0
      const jitter = ((p.id.charCodeAt(0) + i * 11) % 5) - 2
      const bpm = Math.max(5, Math.min(35, Math.round(baseBlink + variation + jitter)))

      // eslint-disable-next-line no-await-in-loop
      await saveBlinkRateRecord({
        patientId: p.id,
        timestamp: ts,
        blinksPerMinute: bpm,
        confidence: 75 + ((i + p.id.length) % 20),
        context: slump ? 'screen' : night ? 'resting' : 'conversation',
      })

      const stressFactor = p.severity === 'high' ? 70 : p.severity === 'medium' ? 50 : 30
      const sessionDuration = (i % 4) * 30 // 0, 30, 60, 90
      const score =
        Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (bpm > 25 ? 60 : bpm < 8 ? 45 : 20) +
                (stressFactor / 100) * 30 +
                (night ? 15 : slump ? 10 : 0) +
                Math.min(15, (sessionDuration / 120) * 15),
            ),
          ),
        )
      const level =
        score <= 33 ? 'alert' : score <= 66 ? 'mild_fatigue' : 'significant_fatigue'

      // eslint-disable-next-line no-await-in-loop
      await saveFatigueRecord({
        patientId: p.id,
        timestamp: ts,
        score,
        level,
        contributingFactors: {
          blinkRate: bpm,
          stressLevel: stressFactor,
          timeOfDay: hour,
          sessionDuration,
        },
        recommendation:
          level === 'alert'
            ? 'You appear alert and focused.'
            : level === 'mild_fatigue'
            ? 'Mild fatigue detected. Take a 5-minute break.'
            : 'Significant fatigue detected. Rest recommended.',
      })
    }
  }

  localStorage.setItem(SEED_KEY, '1')
}

