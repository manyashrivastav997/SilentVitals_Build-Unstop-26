import type { ComponentProps } from 'react'
import { Camera, Mic } from 'lucide-react'

type Props = {
  enabled: boolean
  onToggle: () => void
} & ComponentProps<'button'>

export function CameraButton({ enabled, onToggle, ...rest }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition ${
        enabled ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-zinc-700 hover:bg-zinc-600'
      }`}
      title={enabled ? 'Camera on' : 'Camera off'}
      {...rest}
    >
      <Camera className="h-5 w-5" />
      {!enabled && <span className="absolute h-[2px] w-7 rotate-45 bg-red-400" />}
    </button>
  )
}

export function MicButton({ enabled, onToggle, ...rest }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition ${
        enabled ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-zinc-700 hover:bg-zinc-600'
      }`}
      title={enabled ? 'Microphone on' : 'Microphone off'}
      {...rest}
    >
      <Mic className="h-5 w-5" />
      {!enabled && <span className="absolute h-[2px] w-7 rotate-45 bg-red-400" />}
    </button>
  )
}

