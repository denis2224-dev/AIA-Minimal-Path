export interface GraphNode {
  id: number
  lat: number
  lon: number
  name: string
}

export interface PathNode {
  id: number
  lat: number
  lon: number
}

export interface PathStats {
  nodes_expanded: number
  time_ms: number
  algorithm: 'astar' | 'dijkstra'
}

export interface PathResult {
  distance_m: number
  path: PathNode[]
  stats: PathStats
}

export type Algorithm = 'astar' | 'dijkstra'

export type POICategory = 'hospital' | 'clinic' | 'pharmacy' | 'emergency_station'

export interface POI {
  lat: number
  lon: number
  name: string
  category: POICategory
}
