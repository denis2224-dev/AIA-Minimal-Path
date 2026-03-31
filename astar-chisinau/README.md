# A* Pathfinder — Chișinău, Rîșcani Sector

Interactive shortest-path finder over a real OpenStreetMap street graph, built for a university Algorithms course.

**Three layers:**
1. **Python preprocessing** — downloads OSM data, parses streets, emits `nodes.csv` / `edges.csv`
2. **C core** — loads the graph into a CSR structure, runs A\* and Dijkstra via a shared library
3. **React + TypeScript frontend** — Leaflet map UI with path visualization and algorithm comparison

---

## Prerequisites

- **Python 3.10+** with `pip`
- **GCC** (or Clang / MSVC) and **CMake 3.14+**
- **Node.js 18+** with `npm`

---

## Quick Start

### 1. Preprocess OSM data

```bash
cd preprocess
pip install requests
python preprocess.py
```

This downloads the Rîșcani bounding box from the Overpass API, parses streets, computes the largest strongly-connected component, and writes `data/nodes.csv` + `data/edges.csv`.

### 2. Build the C core

```bash
cd core
mkdir build && cd build
cmake ..
cmake --build .
```

Test with the CLI:

```bash
./astar_cli ../../data/nodes.csv ../../data/edges.csv 0 100
```

Expected output:
```
A*:       distance=1234.5 m  nodes_in_path=42  time=0.003s  expanded=317
Dijkstra: distance=1234.5 m  nodes_in_path=42  time=0.011s  expanded=891

[OK] Both algorithms agree on distance (diff=0.00 m)
```

### 3. Start the Flask server

```bash
cd server
pip install -r requirements.txt
python server.py
```

The server loads the shared library via `ctypes` and listens on `http://localhost:5000`.

### 4. Start the React UI

```bash
cd ui
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## How to Use

1. **Click** on the map to set the **source** (green marker)
2. **Click** again to set the **destination** (red marker)
3. Choose **A\*** or **Dijkstra** in the sidebar
4. Press **Find Path** — the shortest route appears as a red polyline
5. The sidebar shows distance, time, and a bar chart comparing nodes expanded

You can also **search** for streets by name in the sidebar to quickly set source/destination.

---

## A\* vs Dijkstra

| Metric | A\* | Dijkstra |
|---|---|---|
| **Heuristic** | Haversine straight-line distance | None (h = 0) |
| **Optimality** | Yes (Haversine is admissible) | Yes |
| **Nodes expanded** | ~60–80% fewer | Explores in all directions |
| **Time** | Faster for point-to-point | Slower (uniform expansion) |

A\* uses the Haversine distance to the goal as a heuristic. Since the straight-line distance never overestimates the actual road distance, A\* is guaranteed to find the optimal path while expanding significantly fewer nodes.

---

## Project Structure

```
astar-chisinau/
├── data/                  # Generated CSV files
├── preprocess/            # OSM → CSV pipeline
│   └── preprocess.py
├── core/                  # C implementation
│   ├── astar.h/c          # Graph, heap, A*, Dijkstra
│   ├── main.c             # CLI test runner
│   └── CMakeLists.txt
├── server/                # Flask API bridge
│   ├── server.py
│   └── requirements.txt
├── ui/                    # React + TypeScript frontend
│   └── src/
│       ├── App.tsx
│       ├── components/    # MapView, Sidebar, NodeSearch
│       ├── hooks/         # useAstar
│       └── types/         # TypeScript interfaces
└── README.md
```

---

## License

University project — UTM, AIA course.
