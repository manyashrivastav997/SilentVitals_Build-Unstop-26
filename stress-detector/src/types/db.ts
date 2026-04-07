export type HospitalSeverity = 'low' | 'medium' | 'high'

export interface User {
  id: string
  email: string
  role: 'doctor' | 'nurse' | 'patient' | 'guardian' | 'home-user' | 'home-guardian'
  mode: 'hospital' | 'home'
  name: string
  patientId?: string
  doctorId?: string
  nurseId?: string
  attendingDoctorName?: string
  attendingNurseName?: string
  createdAt: Date
}

export interface StressRecord {
  id: string
  userId: string
  timestamp: Date
  score: number
  level: 'Low' | 'Medium' | 'High'
  faceConfidence: number
  audioConfidence: number
  sessionDuration: number
  status?: 'complete' | 'missed'
  concurrentHeartRate?: number
  heartRateVariability?: number
}

export interface HeartRateRecord {
  id: string
  patientId: string
  timestamp: Date
  bpm: number
  source: 'camera' | 'manual' | 'device'
  confidence: number // 0-100
  context?: 'resting' | 'active' | 'stressed'
}

export interface BlinkRateRecord {
  id: string
  patientId: string
  timestamp: Date
  blinksPerMinute: number
  eyeClosureDuration?: number
  confidence: number
  context?: 'resting' | 'reading' | 'screen' | 'conversation'
}

export interface FatigueRecord {
  id: string
  patientId: string
  timestamp: Date
  score: number
  level: 'alert' | 'mild_fatigue' | 'significant_fatigue'
  contributingFactors: {
    blinkRate: number
    stressLevel: number
    timeOfDay: number
    sessionDuration?: number
  }
  recommendation: string
}

export interface ClinicalNote {
  id: string
  patientId: string
  authorId: string
  authorName: string
  role: string
  text: string
  createdAt: Date
}

export interface Patient {
  id: string
  name: string
  email: string
  age: number
  roomNumber: string
  bedNumber: string
  diagnosis: string
  severity: HospitalSeverity
  intervalMinutes: number
  assignedDoctorId: string
  assignedNurseId: string
  doctorName: string
  nurseName: string
  admissionDate: Date
  lastCheckIn: Date
  stressHistory: StressRecord[]
  notes?: ClinicalNote[]
}

export interface IntervalSettings {
  id: string
  patientId: string
  intervalMinutes: number
  lastModifiedBy: string
  lastModifiedAt: Date
  reasonForChange?: string
}

export interface GuardianLink {
  id: string
  patientId: string
  patientName?: string
  guardianId?: string
  homeUserId?: string
  shareCode: string
  relationship?: string
  expiresAt?: Date
  createdAt: Date
  createdBy?: string
}

