import type { GraphNode } from '../types/graph'
import NodeSearch from './NodeSearch'

interface SearchPanelProps {
  nodes: GraphNode[]
  source: GraphNode | null
  destination: GraphNode | null
  onSetSource: (node: GraphNode | null) => void
  onSetDestination: (node: GraphNode | null) => void
  onFindPath: () => void
  onSwap: () => void
  loading: boolean
  error: string | null
}

export default function SearchPanel({
  nodes,
  source,
  destination,
  onSetSource,
  onSetDestination,
  onFindPath,
  onSwap,
  loading,
  error,
}: SearchPanelProps) {
  return (
    <div className="absolute top-4 left-4 z-[1000] w-96">
      {/* Main search card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Emergency Routing</div>
            <div className="text-[10px] text-red-100">Chișinău · Rîșcani</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
            </span>
            <span className="text-[10px] text-red-100 font-medium">ACTIVE</span>
          </div>
        </div>

        {/* Search inputs */}
        <div className="p-3">
          <div className="flex items-stretch gap-2">
            {/* Route dots indicator */}
            <div className="flex flex-col items-center justify-center gap-0.5 py-2 w-5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-300"></div>
              <div className="w-0.5 h-1 bg-gray-300"></div>
              <div className="w-0.5 h-1 bg-gray-300"></div>
              <div className="w-0.5 h-1 bg-gray-300"></div>
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-300"></div>
            </div>

            {/* Inputs */}
            <div className="flex-1 space-y-2">
              <NodeSearch
                nodes={nodes}
                label=""
                placeholder="Ambulance location"
                selectedNode={source}
                onSelect={onSetSource}
              />
              <NodeSearch
                nodes={nodes}
                label=""
                placeholder="Emergency location"
                selectedNode={destination}
                onSelect={onSetDestination}
              />
            </div>

            {/* Swap button */}
            <button
              onClick={onSwap}
              className="self-center p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              title="Swap locations"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Dispatch button */}
          <button
            disabled={!source || !destination || loading}
            onClick={onFindPath}
            className="w-full mt-3 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm
                       hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                       transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20
                       active:scale-[0.98]"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Calculating route…
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
      </div>

      {/* Error toast */}
      {error && (
        <div className="mt-2 p-3 bg-red-600 text-white rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}
