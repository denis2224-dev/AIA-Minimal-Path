import type { GraphNode, PathResult } from '../types/graph'
import NodeSearch from './NodeSearch'

interface SidebarProps {
  nodes: GraphNode[]
  source: GraphNode | null
  destination: GraphNode | null
  onSetSource: (node: GraphNode | null) => void
  onSetDestination: (node: GraphNode | null) => void
  onFindPath: () => void
  result: PathResult | null
  loading: boolean
  error: string | null
}

const AVG_AMBULANCE_SPEED_KMH = 45

export default function Sidebar({
  nodes,
  source,
  destination,
  onSetSource,
  onSetDestination,
  onFindPath,
  result,
  loading,
  error,
}: SidebarProps) {
  const etaMinutes = result
    ? (result.distance_m / 1000 / AVG_AMBULANCE_SPEED_KMH) * 60
    : null

  return (
    <div className="w-80 h-screen bg-white border-r border-gray-200 shadow-lg flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-red-600 to-red-700">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Emergency Routing</h1>
            <p className="text-red-200 text-xs mt-0.5">Ambulance Dispatch · Chișinău</p>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
        <span className="text-xs font-medium text-red-700">System active — Ready to dispatch</span>
      </div>

      {/* Location selection */}
      <div className="px-5 py-4 space-y-3 border-b border-gray-100">
        <NodeSearch
          nodes={nodes}
          label="Ambulance Location"
          selectedNode={source}
          onSelect={onSetSource}
        />
        <NodeSearch
          nodes={nodes}
          label="Emergency Location"
          selectedNode={destination}
          onSelect={onSetDestination}
        />
      </div>

      {/* Dispatch button */}
      <div className="px-5 py-4 border-b border-gray-100">
        <button
          disabled={!source || !destination || loading}
          onClick={onFindPath}
          className="w-full py-3 rounded-lg bg-red-600 text-white font-bold text-sm
                     hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Calculating Route…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Dispatch Route
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="px-5 py-4 space-y-4 flex-1">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Route Details</h2>

          {/* ETA - hero stat */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-xs text-red-600 font-semibold uppercase tracking-wide">Estimated Arrival</div>
            <div className="text-3xl font-bold text-red-700 mt-1">
              {etaMinutes !== null && etaMinutes < 1
                ? '<1'
                : etaMinutes?.toFixed(1)}{' '}
              <span className="text-base font-semibold text-red-500">min</span>
            </div>
            <div className="text-xs text-red-400 mt-0.5">at avg. {AVG_AMBULANCE_SPEED_KMH} km/h</div>
          </div>

          {/* Distance */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Route Distance</div>
            <div className="text-2xl font-bold text-gray-800">
              {(result.distance_m / 1000).toFixed(2)} <span className="text-sm font-normal text-gray-500">km</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Waypoints</div>
              <div className="text-lg font-bold text-gray-800">{result.path.length}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Compute Time</div>
              <div className="text-lg font-bold text-gray-800">
                {result.stats.time_ms.toFixed(1)} <span className="text-xs font-normal text-gray-500">ms</span>
              </div>
            </div>
          </div>

          {/* Algorithm badge */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">A* Algorithm</span>
            <span>· Optimal shortest path</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 mt-auto">
        Click on the map to set ambulance / emergency location
      </div>
    </div>
  )
}
