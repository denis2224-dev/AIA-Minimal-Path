import { useState, useEffect, useCallback, useRef } from 'react'
import type { GraphNode, PathResult } from './types/graph'
import { useAstar } from './hooks/useAstar'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'

export default function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [source, setSource] = useState<GraphNode | null>(null)
  const [destination, setDestination] = useState<GraphNode | null>(null)
  const [result, setResult] = useState<PathResult | null>(null)
  const { findPath, loading, error } = useAstar()
  const clickCount = useRef(0)

  /* Fetch all graph nodes on mount */
  useEffect(() => {
    fetch('/api/nodes')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: GraphNode[]) => setNodes(data))
      .catch((err) => console.error('Failed to load nodes:', err))
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

  /* Set source/destination from sidebar search */
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

  /* Find shortest path using A* */
  const handleFindPath = useCallback(async () => {
    if (!source || !destination) return
    setResult(null)
    const primary = await findPath(source.id, destination.id, 'astar')
    if (primary) setResult(primary)
  }, [source, destination, findPath])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        nodes={nodes}
        source={source}
        destination={destination}
        onSetSource={handleSetSource}
        onSetDestination={handleSetDestination}
        onFindPath={handleFindPath}
        result={result}
        loading={loading}
        error={error}
      />
      <div className="flex-1 h-full">
        <MapView
          nodes={nodes}
          source={source}
          destination={destination}
          onNodeClick={handleNodeClick}
          result={result}
        />
      </div>
    </div>
  )
}
