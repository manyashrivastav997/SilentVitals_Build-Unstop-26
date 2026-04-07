export const FACE_API_MODEL_URL =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

export const SESSION_SECONDS = 15
export const FACE_SAMPLE_COUNT = 5
export const FACE_SAMPLE_INTERVAL_MS = 3000
export const ROLLING_AUDIO_MS = 15_000
export const ROLLING_CHART_MS = 30_000
export const CHART_TICK_MS = 1000

export const WEIGHT_FACE = 0.6
export const WEIGHT_AUDIO = 0.4

/** localStorage keys */
export const LS = {
  history: 'silentvitals.stressHistory',
  intervalMinutes: 'silentvitals.intervalMinutes',
  lastCheckIn: 'silentvitals.lastCheckIn',
  snoozeUntil: 'silentvitals.snoozeUntil',
  firstOpen: 'silentvitals.firstOpen',
} as const
