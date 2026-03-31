import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { GraphNode, PathResult, POI, POICategory } from './types/graph'
import { useAstar } from './hooks/useAstar'
import SearchPanel from './components/Sidebar'
import RouteCard from './components/RouteCard'
import POIToggle from './components/POIToggle'
import MapView from './components/MapView'

export default function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [source, setSource] = useState<GraphNode | null>(null)
  const [destination, setDestination] = useState<GraphNode | null>(null)
  const [result, setResult] = useState<PathResult | null>(null)
  const [pois, setPois] = useState<POI[]>([])
  const [visibleCategories, setVisibleCategories] = useState<Set<POICategory>>(
    new Set(['hospital', 'clinic', 'pharmacy', 'emergency_station'])
  )
  const { findPath, loading, error } = useAstar()
  const clickCount = useRef(0)

  /* Fetch all graph nodes and POIs on mount */
  useEffect(() => {
    fetch('/api/nodes')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: GraphNode[]) => setNodes(data))
      .catch((err) => console.error('Failed to load nodes:', err))

    fetch('/api/pois')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: POI[]) => setPois(data))
      .catch((err) => console.error('Failed to load POIs:', err))
  }, [])

  /* POI counts by category */
  const poiCounts = useMemo(() => {
    const counts = { hospital: 0, clinic: 0, pharmacy: 0, emergency_station: 0 } as Record<POICategory, number>
    for (const p of pois) counts[p.category] = (counts[p.category] || 0) + 1
    return counts
  }, [pois])

  const handleTogglePOI = useCallback((category: POICategory) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }, [])

  /* Handle map node clicks: 1st=ambulance, 2nd=emergency, 3rd=reset */
  const handleNodeClick = useCallback((node: GraphNode) => {
    const next = clickCount.current + 1
    if (next === 1) {
      setSource(node)
      setDestination(null)
      setResult(null)
    } else if (next === 2) {
      setDestination(node)
    } else {
      setSource(node)
      setDestination(null)
      setResult(null)
      clickCount.current = 0
      return
    }
    clickCount.current = next
  }, [])

  /* Set source/destination from search panel */
  const handleSetSource = useCallback((node: GraphNode | null) => {
    setSource(node)
    setResult(null)
    clickCount.current = node ? 1 : 0
  }, [])

  const handleSetDestination = useCallback((node: GraphNode | null) => {
    setDestination(node)
    setResult(null)
    if (node && source) clickCount.current = 2
  }, [source])

  /* Swap source and destination */
  const handleSwap = useCallback(() => {
    setSource(destination)
    setDestination(source)
    setResult(null)
  }, [source, destination])

  /* Find shortest path using A* */
  const handleFindPath = useCallback(async () => {
    if (!source || !destination) return
    setResult(null)
    const primary = await findPath(source.id, destination.id, 'astar')
    if (primary) setResult(primary)
  }, [source, destination, findPath])

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen map */}
      <MapView
        nodes={nodes}
        source={source}
        destination={destination}
        onNodeClick={handleNodeClick}
        result={result}
        pois={pois}
        visibleCategories={visibleCategories}
      />

      {/* Floating search panel (top-left) */}
      <SearchPanel
        nodes={nodes}
        source={source}
        destination={destination}
        onSetSource={handleSetSource}
        onSetDestination={handleSetDestination}
        onFindPath={handleFindPath}
        onSwap={handleSwap}
        loading={loading}
        error={error}
      />

      {/* Floating POI toggles (top-right) */}
      <POIToggle
        visibleCategories={visibleCategories}
        onToggle={handleTogglePOI}
        counts={poiCounts}
      />

      {/* Floating route card (bottom-center) */}
      {result && (
        <RouteCard result={result} onClose={() => setResult(null)} />
      )}
    </div>
  )
}
