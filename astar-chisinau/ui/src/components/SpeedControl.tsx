import type { Dispatch, SetStateAction } from 'react'

export type AnimSpeed = 'instant' | 'fast' | 'slow'

const OPTIONS: { value: AnimSpeed; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'fast', label: 'Fast' },
  { value: 'slow', label: 'Show-off' },
]

interface SpeedControlProps {
  speed: AnimSpeed
  setSpeed: Dispatch<SetStateAction<AnimSpeed>>
}

export default function SpeedControl({ speed, setSpeed }: SpeedControlProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex gap-1 rounded-xl bg-white/90 px-2 py-1.5 shadow-lg backdrop-blur">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setSpeed(o.value)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
            speed === o.value
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
