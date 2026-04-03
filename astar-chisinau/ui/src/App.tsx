import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { GraphNode, PathResult, POI, POICategory } from './types/graph'
import { useAstar } from './hooks/useAstar'
import { buildAdjList, astarGenerator } from './algorithms/astar'
import type { AdjList } from './algorithms/astar'
import type { AnimSpeed } from './components/SpeedControl'
import SearchPanel from './components/Sidebar'
import RouteCard from './components/RouteCard'
import POIToggle from './components/POIToggle'
import SpeedControl from './components/SpeedControl'
import MapView from './components/MapView'

interface AnimState {
  exploredEdges: [number, number][]
  newEdges: [number, number][]
  currentNode: number
}

// Delay between steps for each speed
const STEP_DELAYS: Record<AnimSpeed, number> = {
  instant: 0,
  fast: 0,     // batched, many steps per frame
  slow: 60,    // one step at a time
}

// Steps per animation frame in fast mode
const FAST_BATCH_SIZE = 20

export default function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [source, setSource] = useState<GraphNode | null>(null)
  const [destination, setDestination] = useState<GraphNode | null>(null)
  const [result, setResult] = useState<PathResult | null>(null)
  const [pois, setPois] = useState<POI[]>([])
  const [visibleCategories, setVisibleCategories] = useState<Set<POICategory>>(
    new Set(['hospital', 'clinic', 'pharmacy', 'emergency_station'])
  )
  const [adjList, setAdjList] = useState<AdjList | null>(null)
  const [animSpeed, setAnimSpeed] = useState<AnimSpeed>('instant')
  const [isAnimating, setIsAnimating] = useState(false)
  const [animState, setAnimState] = useState<AnimState | null>(null)
  const { findPath, loading, error } = useAstar()
  const clickCount = useRef(0)
  const stopRef = useRef(false)

  // Fetch all graph nodes, edges, and POIs on mount
  useEffect(() => {
    fetch('/api/nodes')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: GraphNode[]) => setNodes(data))
      .catch((err) => console.error('Failed to load nodes:', err))

    fetch('/api/edges')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: [number, number, number][]) => setAdjList(buildAdjList(data)))
      .catch((err) => console.error('Failed to load edges:', err))

    fetch('/api/pois')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: POI[]) => setPois(data))
      .catch((err) => console.error('Failed to load POIs:', err))
  }, [])

  // POI counts by category
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

  // Handle map node clicks: 1st=source, 2nd=destination, 3rd=reset
  const handleNodeClick = useCallback((node: GraphNode) => {
    const next = clickCount.current + 1
    if (next === 1) {
      setSource(node)
      setDestination(null)
      setResult(null)
      setAnimState(null)
    } else if (next === 2) {
      setDestination(node)
    } else {
      setSource(node)
      setDestination(null)
      setResult(null)
      setAnimState(null)
      clickCount.current = 0
      return
    }
    clickCount.current = next
  }, [])

  // Set source/destination from search panel
  const handleSetSource = useCallback((node: GraphNode | null) => {
    setSource(node)
    setResult(null)
    setAnimState(null)
    clickCount.current = node ? 1 : 0
  }, [])

  const handleSetDestination = useCallback((node: GraphNode | null) => {
    setDestination(node)
    setResult(null)
    setAnimState(null)
    if (node && source) clickCount.current = 2
  }, [source])

  // Swap source and destination
  const handleSwap = useCallback(() => {
    setSource(destination)
    setDestination(source)
    setResult(null)
    setAnimState(null)
  }, [source, destination])

  // Stop ongoing animation
  const handleStopAnimation = useCallback(() => {
    stopRef.current = true
  }, [])

  // Run animated A* using the JS generator
  const runAnimated = useCallback(async (speed: AnimSpeed) => {
    if (!source || !destination || !adjList || nodes.length === 0) return

    setResult(null)
    setIsAnimating(true)
    stopRef.current = false

    const gen = astarGenerator(nodes, adjList, source.id, destination.id)
    const t0 = performance.now()

    const delay = STEP_DELAYS[speed]

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    let lastStep = null

    while (true) {
      if (stopRef.current) break

      if (speed === 'fast') {
        // Batch steps per frame
        for (let i = 0; i < FAST_BATCH_SIZE; i++) {
          const { value, done } = gen.next()
          if (done || !value) break
          lastStep = value
          if (value.done) break
        }
      } else {
        const { value, done } = gen.next()
        if (done || !value) break
        lastStep = value
      }

      if (!lastStep) break

      // Update animation state
      setAnimState({
        exploredEdges: [...lastStep.exploredEdges],
        newEdges: lastStep.newEdges,
        currentNode: lastStep.current,
      })

      if (lastStep.done) break

      // Wait between steps
      if (delay > 0) {
        await sleep(delay)
      } else {
        // Let the browser render
        await new Promise((r) => requestAnimationFrame(r))
      }
    }

    const elapsed = performance.now() - t0

    // Build result from the path
    if (lastStep?.done && lastStep.path) {
      const path = lastStep.path.map((id) => ({
        id,
        lat: nodes[id].lat,
        lon: nodes[id].lon,
      }))
      setResult({
        distance_m: lastStep.distance,
        path,
        stats: {
          nodes_expanded: lastStep.nodesExpanded,
          time_ms: Math.round(elapsed * 100) / 100,
          algorithm: 'astar',
        },
      })
    }

    setIsAnimating(false)
  }, [source, destination, adjList, nodes])

  // Find shortest path: instant (C backend) or animated (JS)
  const handleFindPath = useCallback(async () => {
    if (!source || !destination) return

    if (animSpeed === 'instant') {
      setResult(null)
      setAnimState(null)
      const primary = await findPath(source.id, destination.id, 'astar')
      if (primary) setResult(primary)
    } else {
      runAnimated(animSpeed)
    }
  }, [source, destination, findPath, animSpeed, runAnimated])

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Map */}
      <MapView
        nodes={nodes}
        source={source}
        destination={destination}
        onNodeClick={handleNodeClick}
        result={result}
        pois={pois}
        visibleCategories={visibleCategories}
        animState={animState}
      />

      {/* Search panel */}
      <SearchPanel
        nodes={nodes}
        source={source}
        destination={destination}
        onSetSource={handleSetSource}
        onSetDestination={handleSetDestination}
        onFindPath={handleFindPath}
        onSwap={handleSwap}
        loading={loading || isAnimating}
        error={error}
      />

      {/* POI toggles */}
      <POIToggle
        visibleCategories={visibleCategories}
        onToggle={handleTogglePOI}
        counts={poiCounts}
      />

      {/* Speed control */}
      <SpeedControl
        speed={animSpeed}
        onChangeSpeed={setAnimSpeed}
        isAnimating={isAnimating}
        onStop={handleStopAnimation}
      />

      {/* Route card */}
      {result && (
        <RouteCard result={result} onClose={() => { setResult(null); setAnimState(null) }} />
      )}
    </div>
  )
}
