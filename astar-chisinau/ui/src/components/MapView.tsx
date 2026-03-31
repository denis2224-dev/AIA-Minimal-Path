import { useEffect, useRef, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GraphNode, PathResult } from '../types/graph'

const CENTER: LatLngExpression = [47.05, 28.845]
const ZOOM = 14

interface MapViewProps {
  nodes: GraphNode[]
  source: GraphNode | null
  destination: GraphNode | null
  onNodeClick: (node: GraphNode) => void
  result: PathResult | null
}

/* Find the closest node to a lat/lon click */
function findClosestNode(
  nodes: GraphNode[],
  lat: number,
  lon: number,
): GraphNode | null {
  if (nodes.length === 0) return null
  let best = nodes[0]
  let bestDist = Infinity
  for (const n of nodes) {
    const d = (n.lat - lat) ** 2 + (n.lon - lon) ** 2
    if (d < bestDist) {
      bestDist = d
      best = n
    }
  }
  return best
}

/* Sub-component: captures map clicks and snaps to nearest node */
function ClickHandler({
  nodes,
  onNodeClick,
}: {
  nodes: GraphNode[]
  onNodeClick: (node: GraphNode) => void
}) {
  useMapEvents({
    click(e) {
      const closest = findClosestNode(nodes, e.latlng.lat, e.latlng.lng)
      if (closest) onNodeClick(closest)
    },
  })
  return null
}

/* Sub-component: fly map to a node when it changes */
function FlyTo({ node }: { node: GraphNode | null }) {
  const map = useMap()
  const prevRef = useRef<number | null>(null)

  useEffect(() => {
    if (node && node.id !== prevRef.current) {
      map.flyTo([node.lat, node.lon], Math.max(map.getZoom(), 15), {
        duration: 0.8,
      })
      prevRef.current = node.id
    }
  }, [node, map])

  return null
}

export default function MapView({
  nodes,
  source,
  destination,
  onNodeClick,
  result,
}: MapViewProps) {
  const pathCoords: LatLngExpression[] =
    result?.path.map((p) => [p.lat, p.lon] as LatLngExpression) ?? []

  /* Compute path midpoint for the popup */
  const midpoint: LatLngExpression | null =
    result && result.path.length > 0
      ? ([
          result.path[Math.floor(result.path.length / 2)].lat,
          result.path[Math.floor(result.path.length / 2)].lon,
        ] as LatLngExpression)
      : null

  const distKm = result ? (result.distance_m / 1000).toFixed(2) : '0'

  /* Only render a subset of nodes as circle markers (for perf) */
  const visibleNodes = useCallback(() => {
    // Show all if under 3000, otherwise sample
    if (nodes.length <= 3000) return nodes
    const step = Math.ceil(nodes.length / 3000)
    return nodes.filter((_, i) => i % step === 0)
  }, [nodes])

  return (
    <MapContainer
      center={CENTER}
      zoom={ZOOM}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler nodes={nodes} onNodeClick={onNodeClick} />
      <FlyTo node={source ?? destination} />

      {/* All nodes as tiny blue dots */}
      {visibleNodes().map((n) => (
        <CircleMarker
          key={n.id}
          center={[n.lat, n.lon]}
          radius={2}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.6, weight: 1 }}
        />
      ))}

      {/* Ambulance location marker (blue) */}
      {source && (
        <CircleMarker
          center={[source.lat, source.lon]}
          radius={9}
          pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3 }}
        >
          <Popup>
            <strong>Ambulance</strong>
            <br />
            {source.name || `Node #${source.id}`}
          </Popup>
        </CircleMarker>
      )}

      {/* Emergency location marker (red) */}
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lon]}
          radius={9}
          pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.9, weight: 3 }}
        >
          <Popup>
            <strong>Emergency</strong>
            <br />
            {destination.name || `Node #${destination.id}`}
          </Popup>
        </CircleMarker>
      )}

      {/* Route polyline */}
      {pathCoords.length > 0 && (
        <Polyline
          positions={pathCoords}
          pathOptions={{ color: '#dc2626', weight: 5, opacity: 0.8 }}
        />
      )}

      {/* Midpoint popup with distance */}
      {midpoint && result && (
        <CircleMarker
          center={midpoint}
          radius={0}
          pathOptions={{ opacity: 0 }}
        >
          <Popup autoClose={false} closeOnClick={false}>
            <strong>{distKm} km</strong> · ETA {((result.distance_m / 1000 / 45) * 60).toFixed(1)} min
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
