/**
 * A* pathfinding implemented as a generator that yields each exploration step.
 * Used for the animated visualization mode.
 */

import type { GraphNode } from '../types/graph'

// Adjacency list: nodeId → array of [neighborId, weight]
export type AdjList = Map<number, [number, number][]>

/** An edge drawn on the map: [fromNodeId, toNodeId] */
export type Edge = [number, number]

export interface AstarStep {
  /** New edges explored in this step (from current node to its neighbors) */
  newEdges: Edge[]
  /** All explored edges accumulated so far */
  exploredEdges: Edge[]
  /** The current node being expanded */
  current: number
  /** Number of nodes expanded so far */
  nodesExpanded: number
  /** Whether the algorithm has finished */
  done: boolean
  /** The final path (only set when done=true and path found) */
  path: number[] | null
  /** Total distance in meters (only set when done=true) */
  distance: number
}

/** Haversine distance between two nodes in meters */
function haversine(a: GraphNode, b: GraphNode): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Build adjacency list from raw edge tuples [u, v, weight].
 */
export function buildAdjList(edges: [number, number, number][]): AdjList {
  const adj: AdjList = new Map()
  for (const [u, v, w] of edges) {
    if (!adj.has(u)) adj.set(u, [])
    adj.get(u)!.push([v, w])
  }
  return adj
}

/**
 * Min-heap (priority queue) for A*.
 * Stores [priority, nodeId].
 */
class MinHeap {
  private data: [number, number][] = []

  get size() { return this.data.length }

  push(priority: number, value: number) {
    this.data.push([priority, value])
    this._bubbleUp(this.data.length - 1)
  }

  pop(): [number, number] | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this._sinkDown(0)
    }
    return top
  }

  private _bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.data[i][0] >= this.data[parent][0]) break
      ;[this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]
      i = parent
    }
  }

  private _sinkDown(i: number) {
    const n = this.data.length
    while (true) {
      let smallest = i
      const left = 2 * i + 1
      const right = 2 * i + 2
      if (left < n && this.data[left][0] < this.data[smallest][0]) smallest = left
      if (right < n && this.data[right][0] < this.data[smallest][0]) smallest = right
      if (smallest === i) break
      ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
      i = smallest
    }
  }
}

/**
 * A* generator — yields a step each time a node is expanded.
 */
export function* astarGenerator(
  nodes: GraphNode[],
  adj: AdjList,
  srcId: number,
  dstId: number,
): Generator<AstarStep, void, unknown> {
  const dst = nodes[dstId]
  const gScore = new Float64Array(nodes.length).fill(Infinity)
  const cameFrom = new Int32Array(nodes.length).fill(-1)
  const openSet = new Set<number>()
  const closedSet = new Set<number>()

  const allEdges: Edge[] = []

  gScore[srcId] = 0
  const heap = new MinHeap()
  heap.push(haversine(nodes[srcId], dst), srcId)
  openSet.add(srcId)

  while (heap.size > 0) {
    const [, current] = heap.pop()!

    // Skip if already processed
    if (closedSet.has(current)) continue

    openSet.delete(current)
    closedSet.add(current)

    // Found destination
    if (current === dstId) {
      const path: number[] = []
      let node = dstId
      while (node !== -1) {
        path.push(node)
        node = cameFrom[node]
      }
      path.reverse()

      yield {
        newEdges: [],
        exploredEdges: allEdges,
        current,
        nodesExpanded: closedSet.size,
        done: true,
        path,
        distance: gScore[dstId],
      }
      return
    }

    // Expand neighbors and collect new edges
    const neighbors = adj.get(current)
    const stepEdges: Edge[] = []

    if (neighbors) {
      for (const [neighbor, weight] of neighbors) {
        if (closedSet.has(neighbor)) continue

        // Always draw the edge being considered
        stepEdges.push([current, neighbor])

        const tentativeG = gScore[current] + weight
        if (tentativeG < gScore[neighbor]) {
          cameFrom[neighbor] = current
          gScore[neighbor] = tentativeG
          const f = tentativeG + haversine(nodes[neighbor], dst)
          heap.push(f, neighbor)
          openSet.add(neighbor)
        }
      }
    }

    allEdges.push(...stepEdges)

    // Yield step with new edges
    yield {
      newEdges: stepEdges,
      exploredEdges: allEdges,
      current,
      nodesExpanded: closedSet.size,
      done: false,
      path: null,
      distance: 0,
    }
  }

  // No path found
  yield {
    newEdges: [],
    exploredEdges: allEdges,
    current: -1,
    nodesExpanded: closedSet.size,
    done: true,
    path: null,
    distance: 0,
  }
}
