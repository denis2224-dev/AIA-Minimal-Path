import { useState, useMemo, useRef, useEffect } from 'react'
import type { GraphNode } from '../types/graph'

interface NodeSearchProps {
  nodes: GraphNode[]
  label: string
  placeholder?: string
  selectedNode: GraphNode | null
  onSelect: (node: GraphNode) => void
}

export default function NodeSearch({ nodes, label, placeholder, selectedNode, onSelect }: NodeSearchProps) {
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
      {label && (
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </label>
      )}
      {selectedNode ? (
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
          <div className="truncate">
            <span className="font-medium text-gray-800">
              {selectedNode.name || `Node #${selectedNode.id}`}
            </span>
          </div>
          <button
            onClick={() => {
              onSelect(null as unknown as GraphNode)
              setQuery('')
            }}
            className="text-gray-400 hover:text-red-500 ml-2 text-lg leading-none shrink-0"
            title="Clear"
          >
            ×
          </button>
        </div>
      ) : (
        <input
          type="text"
          placeholder={placeholder || 'Search street name…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => query.trim() && setOpen(true)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-300
                     placeholder:text-gray-400 transition-all"
        />
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-[1100] mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {filtered.map((n) => (
            <li
              key={n.id}
              onClick={() => {
                onSelect(n)
                setQuery('')
                setOpen(false)
              }}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-red-50 border-b border-gray-100 last:border-b-0
                         flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="font-medium text-gray-700 truncate">{n.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
