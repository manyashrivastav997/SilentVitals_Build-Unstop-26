import type { RefObject } from 'react'

type VideoFeedProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  sessionRunning: boolean
  modelsLoading: boolean
  loadProgress: number
  loadError: string | null
  mediaError: string | null
}

export function VideoFeed({
  videoRef,
  canvasRef,
  sessionRunning,
  modelsLoading,
  loadProgress,
  loadError,
  mediaError,
}: VideoFeedProps) {
  return (
    <div className="relative flex min-h-[220px] w-full flex-1 flex-col overflow-hidden rounded-xl bg-zinc-900/80 ring-1 ring-zinc-700/80 sm:min-h-[280px]">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />

        {modelsLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 px-4 text-center">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"
              aria-hidden
            />
            <p className="text-sm text-zinc-200">Loading face models…</p>
            <div className="h-1.5 w-48 max-w-[80%] overflow-hidden rounded-full bg-zinc-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${Math.round(loadProgress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400">{Math.round(loadProgress * 100)}%</p>
          </div>
        )}

        {!modelsLoading && loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-red-300">
            {loadError}
          </div>
        )}

        {!modelsLoading && !loadError && mediaError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-amber-200">
            {mediaError}
          </div>
        )}

        {!modelsLoading && !loadError && !mediaError && !sessionRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-sm text-zinc-300">
            Press <strong className="text-white">Start Check</strong> to begin a 15s session. Face samples every 3s (5 total).
          </div>
        )}
      </div>
      <p className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
        Landmarks update during an active session. Expression sampling runs on schedule.
      </p>
    </div>
  )
}
