import { WEIGHT_AUDIO, WEIGHT_FACE } from '../constants'

export type StressLevel = 'low' | 'medium' | 'high'

export function scoreToLevel(score: number): StressLevel {
  if (score <= 33) return 'low'
  if (score <= 66) return 'medium'
  return 'high'
}

export function levelToLabel(level: StressLevel): 'Low' | 'Medium' | 'High' {
  if (level === 'low') return 'Low'
  if (level === 'medium') return 'Medium'
  return 'High'
}

/**
 * Final = facial × 0.6 + audio × 0.4. If no valid facial signal, use audio only (100%).
 */
export function combineStress(facialScore: number | null, audioScore: number): number {
  if (facialScore === null) return Math.min(100, Math.max(0, audioScore))
  return Math.min(
    100,
    Math.max(0, facialScore * WEIGHT_FACE + audioScore * WEIGHT_AUDIO),
  )
}

/** Live partial average of face samples so far (only valid samples). */
export function combineStressLive(
  validFaceScores: number[],
  audioScore: number,
): number {
  if (validFaceScores.length === 0) return Math.min(100, Math.max(0, audioScore))
  const faceAvg =
    validFaceScores.reduce((a, b) => a + b, 0) / validFaceScores.length
  return combineStress(faceAvg, audioScore)
}
