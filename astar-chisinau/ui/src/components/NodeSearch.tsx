import { useState, useMemo, useRef, useEffect } from 'react'
import type { GraphNode } from '../types/graph'

interface NodeSearchProps {
  nodes: GraphNode[]
  label: string
  selectedNode: GraphNode | null
  onSelect: (node: GraphNode) => void
}

export default function NodeSearch({ nodes, label, selectedNode, onSelect }: NodeSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Filter nodes by street name
  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return nodes
      .filter((n) => n.name && n.name.toLowerCase().includes(q))
      .slice(0, 50)
  }, [nodes, query])

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {selectedNode ? (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <div>
            <span className="font-medium text-gray-800">
              {selectedNode.name || `Node #${selectedNode.id}`}
            </span>
            <span className="ml-2 text-gray-400 text-xs">
              ({selectedNode.lat.toFixed(5)}, {selectedNode.lon.toFixed(5)})
            </span>
          </div>
          <button
            onClick={() => {
              onSelect(null as unknown as GraphNode)
              setQuery('')
            }}
            className="text-gray-400 hover:text-red-500 ml-2 text-lg leading-none"
            title="Clear"
          >
            ×
          </button>
        </div>
      ) : (
        <input
          type="text"
          placeholder="Search street name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => query.trim() && setOpen(true)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((n) => (
            <li
              key={n.id}
              onClick={() => {
                onSelect(n)
                setQuery('')
                setOpen(false)
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
            >
              <span className="font-medium text-gray-800">{n.name}</span>
              <span className="ml-2 text-gray-400 text-xs">#{n.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
