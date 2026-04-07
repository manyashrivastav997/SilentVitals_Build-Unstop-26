import { nets } from '@vladmandic/face-api'
import { FACE_API_MODEL_URL } from '../constants'

let cached: Promise<void> | null = null

export function loadFaceApiModels(onProgress: (p: number) => void): Promise<void> {
  if (cached) {
    onProgress(1)
    return cached
  }
  cached = (async () => {
    await nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL)
    onProgress(1 / 3)
    await nets.faceLandmark68TinyNet.loadFromUri(FACE_API_MODEL_URL)
    onProgress(2 / 3)
    await nets.faceExpressionNet.loadFromUri(FACE_API_MODEL_URL)
    onProgress(1)
  })()
  return cached
}
