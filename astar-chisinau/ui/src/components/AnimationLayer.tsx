// Canvas-based animation overlay for the A* visualization

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { GraphNode } from '../types/graph'
import type { Edge } from '../algorithms/astar'

interface AnimationLayerProps {
  nodes: GraphNode[]
  exploredEdges: Edge[]
  newEdges: Edge[]
  currentNode: number
  pathCoords: [number, number][]  // lat,lon pairs of the final shortest path
}

export default function AnimationLayer({
  nodes,
  exploredEdges,
  newEdges,
  currentNode,
  pathCoords,
}: AnimationLayerProps) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Create canvas and attach it to the map container
  useEffect(() => {
    const container = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '450'

    container.appendChild(canvas)
    canvasRef.current = canvas

    return () => {
      canvas.remove()
      canvasRef.current = null
    }
  }, [map])

  // Redraw continuously using requestAnimationFrame
  useEffect(() => {
    let rafId = 0

    function draw() {
      if (!canvasRef.current) return
      const c = canvasRef.current
      const size = map.getSize()
      const dpr = window.devicePixelRatio || 1

      // Resize if needed
      const w = size.x * dpr
      const h = size.y * dpr
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }

      const ctx = c.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size.x, size.y)

      // Scale line widths with zoom level
      const zoom = map.getZoom()
      const scale = Math.pow(1.35, zoom - 13) // 1x at zoom 13, grows/shrinks with zoom
      const baseWidth = Math.max(2, 3 * scale)
      const shadowWidth = Math.max(3, 5 * scale)
      const newWidth = Math.max(2.5, 4 * scale)
      const dotRadius = Math.max(3, 5 * scale)
      const dotHalo = Math.max(6, 12 * scale)

      // Track which edges are new (current step)
      const newEdgeSet = new Set<string>()
      for (const [u, v] of newEdges) {
        newEdgeSet.add(`${u}-${v}`)
      }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const total = exploredEdges.length

      // Draw shadow under explored edges
      ctx.globalAlpha = 0.1
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = shadowWidth
      for (let i = 0; i < total; i++) {
        const [u, v] = exploredEdges[i]
        if (newEdgeSet.has(`${u}-${v}`)) continue
        const a = nodes[u], b = nodes[v]
        if (!a || !b) continue
        const pA = map.latLngToContainerPoint([a.lat, a.lon])
        const pB = map.latLngToContainerPoint([b.lat, b.lon])
        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.lineTo(pB.x, pB.y)
        ctx.stroke()
      }

      // Draw explored edges in red
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = baseWidth
      for (let i = 0; i < total; i++) {
        const [u, v] = exploredEdges[i]
        if (newEdgeSet.has(`${u}-${v}`)) continue
        const a = nodes[u], b = nodes[v]
        if (!a || !b) continue
        const pA = map.latLngToContainerPoint([a.lat, a.lon])
        const pB = map.latLngToContainerPoint([b.lat, b.lon])
        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.lineTo(pB.x, pB.y)
        ctx.stroke()
      }

      // Draw new edges (current step) in brighter red
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = newWidth
      for (const [u, v] of newEdges) {
        const a = nodes[u], b = nodes[v]
        if (!a || !b) continue
        const pA = map.latLngToContainerPoint([a.lat, a.lon])
        const pB = map.latLngToContainerPoint([b.lat, b.lon])
        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.lineTo(pB.x, pB.y)
        ctx.stroke()
      }

      // Draw current node as a red dot
      if (currentNode >= 0 && nodes[currentNode]) {
        const node = nodes[currentNode]
        const pt = map.latLngToContainerPoint([node.lat, node.lon])

        ctx.globalAlpha = 0.25
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, dotHalo, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 1
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw the shortest path in blue on top
      if (pathCoords.length > 1) {
        // Path shadow
        ctx.globalAlpha = 0.1
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = shadowWidth + 3
        ctx.beginPath()
        for (let i = 0; i < pathCoords.length; i++) {
          const pt = map.latLngToContainerPoint(pathCoords[i])
          if (i === 0) ctx.moveTo(pt.x, pt.y)
          else ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()

        // Blue path line
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = '#4285F4'
        ctx.lineWidth = baseWidth + 2
        ctx.beginPath()
        for (let i = 0; i < pathCoords.length; i++) {
          const pt = map.latLngToContainerPoint(pathCoords[i])
          if (i === 0) ctx.moveTo(pt.x, pt.y)
          else ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()
      }

      ctx.globalAlpha = 1
    }

    // Animation loop
    function loop() {
      draw()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [map, nodes, exploredEdges, newEdges, currentNode, pathCoords])

  return null
}
