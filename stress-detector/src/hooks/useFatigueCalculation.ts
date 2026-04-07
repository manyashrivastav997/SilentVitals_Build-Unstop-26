import { useEffect, useState } from 'react'

export type FatigueLevel = 'alert' | 'mild_fatigue' | 'significant_fatigue'

export function useFatigueCalculation(inputs: {
  blinkRate: number | null
  stressLevel: number | null
  timeOfDay: number
  sessionDuration?: number
  eyeClosureDuration?: number
}) {
  const [fatigue, setFatigue] = useState<{
    score: number
    level: FatigueLevel
    recommendation: string
    contributingFactors: {
      blinkRate: number
      stressLevel: number
      timeOfDay: number
      sessionDuration: number
    }
  } | null>(null)

  useEffect(() => {
    if (inputs.blinkRate === null || inputs.stressLevel === null) return

    let score = 0

    // Blink rate factor
    let blinkScore = 0
    if (inputs.blinkRate > 25) {
      blinkScore = Math.min(40, ((inputs.blinkRate - 25) / 15) * 40)
    } else if (inputs.blinkRate < 8) {
      blinkScore = Math.min(30, ((8 - inputs.blinkRate) / 8) * 30)
    }
    score += blinkScore

    // Stress factor
    score += (inputs.stressLevel / 100) * 30

    // Time of day factor
    const hour = inputs.timeOfDay
    if (hour >= 22 || hour <= 6) score += 15
    else if (hour >= 13 && hour <= 15) score += 10
    else if (hour >= 10 && hour <= 11) score += 5

    // Session duration factor
    if (inputs.sessionDuration) {
      score += Math.min(15, (inputs.sessionDuration / 120) * 15)
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(score)))
    let level: FatigueLevel
    let recommendation = ''

    if (finalScore <= 33) {
      level = 'alert'
      recommendation = 'You appear alert and focused.'
    } else if (finalScore <= 66) {
      level = 'mild_fatigue'
      recommendation = 'Mild fatigue detected. Take a 5-minute break.'
    } else {
      level = 'significant_fatigue'
      recommendation =
        'Significant fatigue detected. Rest recommended. Take 15 minutes away from screens and hydrate.'
    }

    setFatigue({
      score: finalScore,
      level,
      recommendation,
      contributingFactors: {
        blinkRate: inputs.blinkRate,
        stressLevel: inputs.stressLevel,
        timeOfDay: inputs.timeOfDay,
        sessionDuration: inputs.sessionDuration || 0,
      },
    })
  }, [inputs.blinkRate, inputs.sessionDuration, inputs.stressLevel, inputs.timeOfDay])

  return fatigue
}

