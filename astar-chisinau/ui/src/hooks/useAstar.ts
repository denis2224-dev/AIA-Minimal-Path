import { useState, useCallback } from 'react'
import type { PathResult, Algorithm } from '../types/graph'

interface UseAstarReturn {
  findPath: (src: number, dst: number, algo: Algorithm) => Promise<PathResult | null>
  loading: boolean
  error: string | null
}

export function useAstar(): UseAstarReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const findPath = useCallback(
    async (src: number, dst: number, algo: Algorithm): Promise<PathResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ src, dst, algorithm: algo }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const data: PathResult = await res.json()
        return data
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return { findPath, loading, error }
}
