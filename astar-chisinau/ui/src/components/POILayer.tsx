import { CircleMarker, Popup } from 'react-leaflet'
import type { POI, POICategory } from '../types/graph'

interface POILayerProps {
  pois: POI[]
  visibleCategories: Set<POICategory>
}

const POI_STYLES: Record<POICategory, { color: string; fill: string; icon: string }> = {
  hospital:          { color: '#dc2626', fill: '#fca5a5', icon: '🏥' },
  clinic:            { color: '#ea580c', fill: '#fdba74', icon: '🩺' },
  pharmacy:          { color: '#16a34a', fill: '#86efac', icon: '💊' },
  emergency_station: { color: '#7c3aed', fill: '#c4b5fd', icon: '🚑' },
}

export default function POILayer({ pois, visibleCategories }: POILayerProps) {
  return (
    <>
      {pois
        .filter((p) => visibleCategories.has(p.category))
        .map((p, i) => {
          const style = POI_STYLES[p.category]
          return (
            <CircleMarker
              key={`poi-${i}`}
              center={[p.lat, p.lon]}
              radius={6}
              pathOptions={{
                color: style.color,
                fillColor: style.fill,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui', fontSize: '13px' }}>
                  <span style={{ marginRight: 4 }}>{style.icon}</span>
                  <strong>{p.name || p.category.replace('_', ' ')}</strong>
                  <br />
                  <span style={{ color: '#6b7280', fontSize: '11px' }}>
                    {p.category.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
    </>
  )
}
