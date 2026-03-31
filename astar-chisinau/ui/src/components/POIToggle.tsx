import type { POICategory } from '../types/graph'

interface POIToggleProps {
  visibleCategories: Set<POICategory>
  onToggle: (category: POICategory) => void
  counts: Record<POICategory, number>
}

const CATEGORIES: { key: POICategory; label: string; icon: string; color: string }[] = [
  { key: 'hospital',          label: 'Hospitals',  icon: '🏥', color: 'bg-red-500' },
  { key: 'clinic',            label: 'Clinics',    icon: '🩺', color: 'bg-orange-500' },
  { key: 'pharmacy',          label: 'Pharmacies', icon: '💊', color: 'bg-green-500' },
  { key: 'emergency_station', label: 'Emergency',  icon: '🚑', color: 'bg-purple-500' },
]

export default function POIToggle({ visibleCategories, onToggle, counts }: POIToggleProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nearby</span>
        </div>
        <div className="p-1.5 space-y-0.5">
          {CATEGORIES.map(({ key, label, icon, color }) => {
            const active = visibleCategories.has(key)
            const count = counts[key] || 0
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-sm transition-all
                           ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                <span className="text-base leading-none">{icon}</span>
                <span className={`font-medium ${active ? '' : 'opacity-60'}`}>{label}</span>
                <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full
                                 ${active ? `${color} text-white` : 'bg-gray-200 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
