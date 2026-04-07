import type { MutableRefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  detectSingleFace,
  draw,
  matchDimensions,
  nets,
  resizeResults,
  TinyFaceDetectorOptions,
} from '@vladmandic/face-api'
import type { FaceExpressions, FaceLandmarks68 } from '@vladmandic/face-api'
import { loadFaceApiModels } from './loadFaceApiModels'

const detectorOptions = new TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.45,
})

/** angry 0.35 + fearful 0.30 + disgusted 0.20 + sad 0.15 → 0–100 */
export function weightedFacialStress(expr: FaceExpressions): number {
  const raw =
    expr.angry * 0.35 + expr.fearful * 0.3 + expr.disgusted * 0.2 + expr.sad * 0.15
  return Math.min(100, Math.max(0, raw * 100))
}

type FacePipelineResult = { landmarks: FaceLandmarks68; expressions: FaceExpressions }

export function useFaceStress(sessionActiveRef: MutableRefObject<boolean>) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastResultRef = useRef<FacePipelineResult | null>(null)
  const rafRef = useRef(0)

  const [modelsReady, setModelsReady] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) {
        setModelsLoading(true)
        setLoadError(null)
      }
    })
    loadFaceApiModels((p) => {
      if (!cancelled) setLoadProgress(p)
    })
      .then(() => {
        if (!cancelled) {
          setModelsReady(
            nets.tinyFaceDetector.isLoaded &&
              nets.faceLandmark68TinyNet.isLoaded &&
              nets.faceExpressionNet.isLoaded,
          )
          setModelsLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load face models')
          setModelsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sampleFace = useCallback(async (video: HTMLVideoElement): Promise<number | null> => {
    if (!modelsReady || video.readyState < 2) return null
    try {
      const result = await detectSingleFace(video, detectorOptions)
        .withFaceLandmarks(true)
        .withFaceExpressions()
        .run()
      if (!result) {
        lastResultRef.current = null
        return null
      }
      lastResultRef.current = result as FacePipelineResult
      return weightedFacialStress(result.expressions)
    } catch {
      lastResultRef.current = null
      return null
    }
  }, [modelsReady])

  useEffect(() => {
    const loop = () => {
      if (!sessionActiveRef.current) {
        lastResultRef.current = null
        const c = canvasRef.current
        if (c) {
          const ctx = c.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, c.width, c.height)
        }
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      const displaySize = { width: video.videoWidth, height: video.videoHeight }
      if (displaySize.width === 0 || displaySize.height === 0) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      matchDimensions(canvas, displaySize)
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      const res = lastResultRef.current
      if (res) {
        const resized = resizeResults(res, displaySize) as { landmarks: FaceLandmarks68 }
        draw.drawFaceLandmarks(canvas, resized.landmarks)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [sessionActiveRef])

  const clearLandmarks = useCallback(() => {
    lastResultRef.current = null
  }, [])

  return {
    videoRef,
    canvasRef,
    modelsReady,
    modelsLoading,
    loadProgress,
    loadError,
    sampleFace,
    clearLandmarks,
  }
}
