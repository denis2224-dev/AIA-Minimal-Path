import type { PathResult } from '../types/graph'

interface RouteCardProps {
  result: PathResult
  onClose: () => void
}

const AVG_SPEED_KMH = 45

export default function RouteCard({ result, onClose }: RouteCardProps) {
  const distKm = result.distance_m / 1000
  const etaMin = (distKm / AVG_SPEED_KMH) * 60

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[480px] max-w-[calc(100vw-2rem)]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-red-500 via-red-400 to-orange-400"></div>

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* ETA - hero number */}
              <div className="text-3xl font-black text-gray-900 leading-none">
                {etaMin < 1 ? '<1' : Math.round(etaMin)}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-700">min</div>
                <div className="text-xs text-gray-400">
                  {distKm.toFixed(1)} km · {result.path.length} waypoints
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>avg. {AVG_SPEED_KMH} km/h</span>
            </div>
            <div className="w-px h-3 bg-gray-200"></div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span>A* · {result.stats.time_ms.toFixed(1)} ms compute</span>
            </div>
            <div className="w-px h-3 bg-gray-200"></div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Optimal route</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
