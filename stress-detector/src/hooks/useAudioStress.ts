import { useCallback, useEffect, useRef } from 'react'

const FFT_SIZE = 2048
const MIN_VOICE_HZ = 80
const MAX_VOICE_HZ = 400
const PITCH_RING = 32
const RMS_CEIL = 0.22
const PITCH_VAR_CEIL = 45_000

import { ROLLING_AUDIO_MS } from '../constants'

function variance(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
}

function binFrequency(bin: number, sampleRate: number, fftSize: number): number {
  return (bin * sampleRate) / fftSize
}

type Sample = { t: number; rms: number; pitchHz: number | null }

function trimWindow(samples: Sample[], now: number): void {
  const cutoff = now - ROLLING_AUDIO_MS
  while (samples.length > 0 && samples[0]!.t < cutoff) samples.shift()
}

/** RMS + pitch variance over rolling window → 0–100 */
function stressFromWindow(samples: Sample[]): number {
  if (samples.length === 0) return 0
  const rmsVals = samples.map((s) => s.rms)
  const meanRms = rmsVals.reduce((a, b) => a + b, 0) / rmsVals.length
  const rmsNorm = Math.min(1, meanRms / RMS_CEIL)

  const pitches = samples.map((s) => s.pitchHz).filter((p): p is number => p != null)
  const pitchVarNorm =
    pitches.length >= 2 ? Math.min(1, variance(pitches) / PITCH_VAR_CEIL) : 0

  const combined01 = 0.38 * rmsNorm + 0.62 * pitchVarNorm
  return Math.min(100, Math.max(0, combined01 * 100))
}

export function useAudioStress() {
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const samplesRef = useRef<Sample[]>([])
  const pitchScratchRef = useRef<number[]>([])
  const timeDataRef = useRef<Float32Array | null>(null)
  const freqDataRef = useRef<Float32Array | null>(null)
  const rafRef = useRef(0)

  const disconnect = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void ctxRef.current?.close()
    ctxRef.current = null
    analyserRef.current = null
    samplesRef.current = []
    pitchScratchRef.current = []
  }, [])

  const reset = useCallback(() => {
    samplesRef.current = []
    pitchScratchRef.current = []
  }, [])

  const connect = useCallback(async (stream: MediaStream) => {
    disconnect()
    streamRef.current = stream
    const ctx = new AudioContext()
    await ctx.resume()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.45
    source.connect(analyser)
    ctxRef.current = ctx
    analyserRef.current = analyser
    const td = new ArrayBuffer(analyser.fftSize * 4)
    const fd = new ArrayBuffer(analyser.frequencyBinCount * 4)
    timeDataRef.current = new Float32Array(td)
    freqDataRef.current = new Float32Array(fd)
  }, [disconnect])

  const tick = useCallback(() => {
    const analyser = analyserRef.current
    const timeBuf = timeDataRef.current
    const freqBuf = freqDataRef.current
    const ctx = ctxRef.current
    if (!analyser || !timeBuf || !freqBuf || !ctx) return

    analyser.getFloatTimeDomainData(timeBuf as Float32Array<ArrayBuffer>)
    analyser.getFloatFrequencyData(freqBuf as Float32Array<ArrayBuffer>)

    let sumSq = 0
    for (let i = 0; i < timeBuf.length; i++) sumSq += timeBuf[i]! ** 2
    const rms = Math.sqrt(sumSq / timeBuf.length)

    const binCount = freqBuf.length
    const fftSize = (binCount - 1) * 2
    let peakBin = -1
    let peakMag = -Infinity
    for (let i = 1; i < binCount; i++) {
      const hz = binFrequency(i, ctx.sampleRate, fftSize)
      if (hz < MIN_VOICE_HZ || hz > MAX_VOICE_HZ) continue
      const m = freqBuf[i]!
      if (m > peakMag) {
        peakMag = m
        peakBin = i
      }
    }

    let pitchHz: number | null = null
    if (peakBin > 0 && peakMag > -85) {
      pitchHz = binFrequency(peakBin, ctx.sampleRate, fftSize)
      const ph = pitchScratchRef.current
      ph.push(pitchHz)
      while (ph.length > PITCH_RING) ph.shift()
    }

    const now = Date.now()
    const pitchForSample =
      pitchScratchRef.current.length >= 2
        ? pitchScratchRef.current[pitchScratchRef.current.length - 1]!
        : pitchHz

    samplesRef.current.push({
      t: now,
      rms,
      pitchHz: pitchForSample,
    })
    trimWindow(samplesRef.current, now)
  }, [])

  useEffect(() => {
    const loop = () => {
      tick()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  const getRollingStress = useCallback((): number => {
    return stressFromWindow(samplesRef.current)
  }, [])

  return {
    connect,
    disconnect,
    reset,
    getRollingStress,
  }
}
