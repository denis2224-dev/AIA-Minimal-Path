export type AnimSpeed = 'instant' | 'fast' | 'slow'

interface SpeedControlProps {
  speed: AnimSpeed
  onChangeSpeed: (speed: AnimSpeed) => void
  isAnimating: boolean
  onStop: () => void
}

const SPEEDS: { key: AnimSpeed; label: string; desc: string; icon: string }[] = [
  { key: 'instant',  label: 'Instant',  desc: 'No animation', icon: '⚡' },
  { key: 'fast',     label: 'Fast',     desc: '~2s total',    icon: '🔥' },
  { key: 'slow',     label: 'Show-off', desc: 'Step by step', icon: '🔍' },
]

export default function SpeedControl({ speed, onChangeSpeed, isAnimating, onStop }: SpeedControlProps) {
  return (
    <div className="absolute bottom-6 right-4 z-[1000]">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Algorithm Speed</span>
          {isAnimating && (
            <button
              onClick={onStop}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider"
            >
              Stop
            </button>
          )}
        </div>
        <div className="p-1.5 space-y-0.5">
          {SPEEDS.map(({ key, label, desc, icon }) => {
            const active = speed === key
            return (
              <button
                key={key}
                onClick={() => onChangeSpeed(key)}
                disabled={isAnimating}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-sm transition-all
                           ${active
                             ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                             : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
                           ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-base leading-none">{icon}</span>
                <div>
                  <span className={`font-medium ${active ? 'text-blue-700' : ''}`}>{label}</span>
                  <span className="ml-1.5 text-[10px] text-gray-400">{desc}</span>
                </div>
              </button>
            )
          })}
        </div>

        {isAnimating && (
          <div className="px-3 py-2 border-t border-gray-100 bg-orange-50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-orange-700">Exploring...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
