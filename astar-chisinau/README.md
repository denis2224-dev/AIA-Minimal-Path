# Emergency Ambulance Routing - Chișinău

Real-time emergency ambulance dispatch routing over a real OpenStreetMap street graph of the Chișinău, Moldova. Built for the AIA course at UTM.

Uses the **A\* algorithm** with a Haversine heuristic to compute the optimal shortest path between any two points on the street network.

**Three layers:**
1. **Python preprocessing** — downloads OSM data, parses streets, emits `nodes.csv` / `edges.csv`
2. **C core** — loads the graph into a CSR structure, runs A\* via a shared library (`.so` / `.dylib` / `.dll`)
3. **React + TypeScript frontend** — Leaflet map UI with emergency routing theme, ETA calculation

---

## Contributions

- **Bradu Stanislav** — UI design, React components, TypeScript types
- **Moroz Denis** — Python preprocessing, Flask API, Graph data extraction, OSM parsing
- **Nenita David** — Algorithm deep study, software application, documentation
- **Rusu Sergiu** — Problem analysis, documentation, real life use case research
- **Zavtoni Ion** — A* implementation in C, CLI testing
- **All team members** contributed to project structure, testing, and final presentation.
---

## Quick Start (Docker)

The easiest way — requires only [Docker](https://www.docker.com/):

```bash
git clone https://github.com/denis2224-dev/AIA-Minimal-Path.git
cd AIA-Minimal-Path/astar-chisinau
docker compose up --build
```

Open **http://localhost:3000** — done.

---

## Quick Start (Manual)

### Prerequisites

- **Python 3.10+** with `pip`
- **GCC** (or Clang / MSVC) and **CMake 3.14+**
- **Node.js 18+** with `npm`

The graph data (`data/nodes.csv`, `data/edges.csv`) is already included in the repo — no preprocessing needed.

### 1. Build the C core

```bash
cd astar-chisinau/core
mkdir build && cd build
cmake .. && cmake --build .
```

### 2. Start the Flask server

```bash
cd astar-chisinau/server
pip install -r requirements.txt
python server.py
```

### 3. Start the React UI

```bash
cd astar-chisinau/ui
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## How to Use

1. **Click** on the map to set the **ambulance location** (blue marker)
2. **Click** again to set the **emergency location** (red marker)
3. Press **Dispatch Route** — the optimal route appears as a red polyline
4. The sidebar shows **ETA**, distance, waypoints, and compute time

You can also **search** for streets by name to quickly set locations.

---

## How A\* Works

A\* finds the shortest path by combining:
- **g(n)** — actual distance from the start to node n
- **h(n)** — Haversine straight-line estimate to the goal (admissible heuristic)
- **f(n) = g(n) + h(n)** — total estimated cost

Because the straight-line distance never overestimates the real road distance, A\* is guaranteed to find the **optimal path** while exploring significantly fewer nodes than uninformed search.

**Graph stats:** 13,976 nodes · 28,932 directed edges · largest SCC of the Rîșcani street network.

---

## Project Structure

```
astar-chisinau/
├── data/                  # Graph CSV files (included in repo)
│   ├── nodes.csv          # 13,976 nodes with lat/lon/street name
│   └── edges.csv          # 28,932 directed edges with distance
├── preprocess/            # OSM → CSV pipeline (optional re-run)
│   └── preprocess.py
├── core/                  # C implementation
│   ├── astar.h/c          # CSR graph, min-heap, A* search
│   ├── main.c             # CLI test runner
│   └── CMakeLists.txt
├── server/                # Flask API bridge (ctypes → C library)
│   ├── server.py
│   ├── Dockerfile
│   └── requirements.txt
├── ui/                    # React + TypeScript + Leaflet frontend
│   ├── Dockerfile
│   └── src/
│       ├── App.tsx
│       ├── components/    # MapView, Sidebar, NodeSearch
│       ├── hooks/         # useAstar
│       └── types/         # TypeScript interfaces
├── docker-compose.yml     # One-command startup
└── README.md
```

---

## License

University project — UTM, AIA course.
