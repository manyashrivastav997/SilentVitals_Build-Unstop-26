import { useEffect, useState, type RefObject } from 'react'

export function useHeartRateDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  isActive: boolean,
) {
  const [heartRate, setHeartRate] = useState<number | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const [isMeasuring, setIsMeasuring] = useState(false)

  useEffect(() => {
    if (!isActive || !videoRef.current) {
      setHeartRate(null)
      setConfidence(0)
      setIsMeasuring(false)
      return
    }

    setIsMeasuring(true)
    const interval = window.setInterval(() => {
      const mockHR = Math.floor(Math.random() * (95 - 65 + 1) + 65)
      setHeartRate(mockHR)
      setConfidence(Math.floor(Math.random() * (95 - 70 + 1) + 70))
    }, 3000)

    return () => {
      window.clearInterval(interval)
      setIsMeasuring(false)
    }
  }, [isActive, videoRef])

  return { heartRate, confidence, isMeasuring }
}

