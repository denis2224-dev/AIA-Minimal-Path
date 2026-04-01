import { useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { GraphNode, PathResult, POI, POICategory } from '../types/graph'
import POILayer from './POILayer'
import AnimationLayer from './AnimationLayer'

const CENTER: LatLngExpression = [47.025, 28.825]
const ZOOM = 13

interface AnimState {
  exploredEdges: [number, number][]
  newEdges: [number, number][]
  currentNode: number
}

interface MapViewProps {
  nodes: GraphNode[]
  source: GraphNode | null
  destination: GraphNode | null
  onNodeClick: (node: GraphNode) => void
  result: PathResult | null
  pois: POI[]
  visibleCategories: Set<POICategory>
  animState: AnimState | null
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

/* Sub-component: fit map to show both markers or fly to a single one */
function FitBounds({
  source,
  destination,
  result,
}: {
  source: GraphNode | null
  destination: GraphNode | null
  result: PathResult | null
}) {
  const map = useMap()
  const prevKey = useRef('')

  useEffect(() => {
    const key = `${source?.id ?? ''}-${destination?.id ?? ''}-${result ? 'r' : ''}`
    if (key === prevKey.current) return
    prevKey.current = key

    if (result && result.path.length > 1) {
      const lats = result.path.map((p) => p.lat)
      const lons = result.path.map((p) => p.lon)
      const bounds: LatLngBoundsExpression = [
        [Math.min(...lats) - 0.002, Math.min(...lons) - 0.005],
        [Math.max(...lats) + 0.006, Math.max(...lons) + 0.005],
      ]
      map.fitBounds(bounds, { padding: [60, 60], duration: 0.8 })
    } else if (source && destination) {
      const bounds: LatLngBoundsExpression = [
        [Math.min(source.lat, destination.lat) - 0.002, Math.min(source.lon, destination.lon) - 0.005],
        [Math.max(source.lat, destination.lat) + 0.006, Math.max(source.lon, destination.lon) + 0.005],
      ]
      map.fitBounds(bounds, { padding: [60, 60], duration: 0.8 })
    } else if (source) {
      map.flyTo([source.lat, source.lon], Math.max(map.getZoom(), 15), { duration: 0.6 })
    } else if (destination) {
      map.flyTo([destination.lat, destination.lon], Math.max(map.getZoom(), 15), { duration: 0.6 })
    }
  }, [source, destination, result, map])

  return null
}

export default function MapView({
  nodes,
  source,
  destination,
  onNodeClick,
  result,
  pois,
  visibleCategories,
  animState,
}: MapViewProps) {
  const pathCoords: LatLngExpression[] =
    result?.path.map((p) => [p.lat, p.lon] as LatLngExpression) ?? []

  return (
    <MapContainer
      center={CENTER}
      zoom={ZOOM}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <ClickHandler nodes={nodes} onNodeClick={onNodeClick} />
      <FitBounds source={source} destination={destination} result={result} />

      {/* A* animation overlay — draws green exploration + blue path on canvas */}
      {animState && (
        <AnimationLayer
          nodes={nodes}
          exploredEdges={animState.exploredEdges}
          newEdges={animState.newEdges}
          currentNode={animState.currentNode}
          pathCoords={result?.path.map((p) => [p.lat, p.lon] as [number, number]) ?? []}
        />
      )}

      {/* POI markers */}
      <POILayer pois={pois} visibleCategories={visibleCategories} />

      {/* Route polylines (only when no animation overlay is active) */}
      {!animState && pathCoords.length > 0 && (
        <Polyline
          positions={pathCoords}
          pathOptions={{ color: '#000000', weight: 8, opacity: 0.1 }}
        />
      )}
      {!animState && pathCoords.length > 0 && (
        <Polyline
          positions={pathCoords}
          pathOptions={{ color: '#4285F4', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
        />
      )}

      {/* Ambulance marker (blue with white center) */}
      {source && (
        <>
          <CircleMarker
            center={[source.lat, source.lon]}
            radius={12}
            pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.25, weight: 2 }}
          />
          <CircleMarker
            center={[source.lat, source.lon]}
            radius={7}
            pathOptions={{ color: '#1d4ed8', fillColor: '#ffffff', fillOpacity: 1, weight: 3 }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '13px' }}>
                <strong>Ambulance</strong><br />
                {source.name || `Node #${source.id}`}
              </div>
            </Popup>
          </CircleMarker>
        </>
      )}

      {/* Emergency marker (red with pulsing outer ring) */}
      {destination && (
        <>
          <CircleMarker
            center={[destination.lat, destination.lon]}
            radius={14}
            pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.15, weight: 2, dashArray: '4 4' }}
          />
          <CircleMarker
            center={[destination.lat, destination.lon]}
            radius={7}
            pathOptions={{ color: '#dc2626', fillColor: '#ffffff', fillOpacity: 1, weight: 3 }}
          >
            <Popup>
              <div style={{ fontFamily: 'system-ui', fontSize: '13px' }}>
                <strong>Emergency</strong><br />
                {destination.name || `Node #${destination.id}`}
              </div>
            </Popup>
          </CircleMarker>
        </>
      )}
    </MapContainer>
  )
}
