#!/usr/bin/env python3
"""
Flask API server that loads the A* shared library via ctypes
and exposes pathfinding endpoints for the React UI.
"""

import os
import sys
import csv
import ctypes
import time
import platform

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
CORE_DIR = os.path.join(BASE_DIR, "..", "core", "build")

NODES_CSV = os.path.join(DATA_DIR, "nodes.csv")
EDGES_CSV = os.path.join(DATA_DIR, "edges.csv")

# ── Detect shared library path ───────────────────────────────────────────────

def find_library():
    """Find the compiled shared library across platforms."""
    system = platform.system()
    candidates = []
    if system == "Darwin":
        candidates = ["libastar.dylib", "libastar.so"]
    elif system == "Linux":
        candidates = ["libastar.so"]
    elif system == "Windows":
        candidates = ["astar.dll", "Release/astar.dll", "Debug/astar.dll"]
    else:
        candidates = ["libastar.so", "libastar.dylib"]

    for name in candidates:
        path = os.path.join(CORE_DIR, name)
        if os.path.isfile(path):
            return path
    return None


# ── Load shared library ─────────────────────────────────────────────────────

LIB = None
GRAPH_HANDLE = None
NODES = []  # list of dicts: {id, lat, lon, name}


def load_library():
    """Load the C shared library and the graph at startup."""
    global LIB, GRAPH_HANDLE, NODES

    lib_path = find_library()
    if lib_path is None:
        print("[ERROR] Shared library not found in", CORE_DIR)
        print("        Build it first:  cd core && mkdir build && cd build && cmake .. && cmake --build .")
        return False

    LIB = ctypes.CDLL(lib_path)

    # Define function signatures
    LIB.graph_load.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
    LIB.graph_load.restype = ctypes.c_void_p

    LIB.graph_astar.argtypes = [
        ctypes.c_void_p, ctypes.c_int, ctypes.c_int,
        ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
    ]
    LIB.graph_astar.restype = ctypes.c_float

    LIB.graph_dijkstra.argtypes = [
        ctypes.c_void_p, ctypes.c_int, ctypes.c_int,
        ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
    ]
    LIB.graph_dijkstra.restype = ctypes.c_float

    LIB.graph_node_latlon.argtypes = [
        ctypes.c_void_p, ctypes.c_int,
        ctypes.POINTER(ctypes.c_double), ctypes.POINTER(ctypes.c_double),
    ]
    LIB.graph_node_latlon.restype = None

    LIB.graph_node_count.argtypes = [ctypes.c_void_p]
    LIB.graph_node_count.restype = ctypes.c_int

    LIB.graph_node_name.argtypes = [ctypes.c_void_p, ctypes.c_int]
    LIB.graph_node_name.restype = ctypes.c_char_p

    LIB.graph_free.argtypes = [ctypes.c_void_p]
    LIB.graph_free.restype = None

    # Load graph
    if not os.path.isfile(NODES_CSV) or not os.path.isfile(EDGES_CSV):
        print("[ERROR] Graph CSV files not found. Run preprocess.py first.")
        return False

    GRAPH_HANDLE = LIB.graph_load(
        NODES_CSV.encode("utf-8"),
        EDGES_CSV.encode("utf-8"),
    )
    if not GRAPH_HANDLE:
        print("[ERROR] graph_load returned NULL.")
        return False

    # Cache node data for the /api/nodes endpoint
    n = LIB.graph_node_count(GRAPH_HANDLE)
    NODES = []
    lat = ctypes.c_double()
    lon = ctypes.c_double()
    for i in range(n):
        LIB.graph_node_latlon(GRAPH_HANDLE, i, ctypes.byref(lat), ctypes.byref(lon))
        name_ptr = LIB.graph_node_name(GRAPH_HANDLE, i)
        name = name_ptr.decode("utf-8", errors="replace") if name_ptr else ""
        NODES.append({
            "id": i,
            "lat": round(lat.value, 7),
            "lon": round(lon.value, 7),
            "name": name,
        })

    print(f"[INFO] Loaded graph with {n} nodes.")
    return True


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.route("/api/nodes")
def api_nodes():
    """Return all graph nodes as a JSON array."""
    if GRAPH_HANDLE is None:
        return jsonify({"error": "Graph not loaded. Run preprocess.py and build the C library first."}), 503
    return jsonify(NODES)


@app.route("/api/path", methods=["POST"])
def api_path():
    """
    Run A* or Dijkstra between two nodes.
    Request body: {"src": int, "dst": int, "algorithm": "astar"|"dijkstra"}
    """
    if GRAPH_HANDLE is None:
        return jsonify({"error": "Graph not loaded."}), 503

    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Invalid JSON body."}), 400

    src = body.get("src")
    dst = body.get("dst")
    algo = body.get("algorithm", "astar")

    if src is None or dst is None:
        return jsonify({"error": "Missing 'src' or 'dst' in request body."}), 400

    src = int(src)
    dst = int(dst)
    n = LIB.graph_node_count(GRAPH_HANDLE)

    if src < 0 or src >= n or dst < 0 or dst >= n:
        return jsonify({"error": f"Node IDs out of range (0..{n-1})."}), 400

    # Allocate result buffers
    result_nodes = (ctypes.c_int * n)()
    result_len = ctypes.c_int(0)
    nodes_expanded = ctypes.c_int(0)

    # Run the chosen algorithm
    t0 = time.perf_counter()
    if algo == "dijkstra":
        distance = LIB.graph_dijkstra(
            GRAPH_HANDLE, src, dst,
            result_nodes, ctypes.byref(result_len),
            ctypes.byref(nodes_expanded),
        )
    else:
        distance = LIB.graph_astar(
            GRAPH_HANDLE, src, dst,
            result_nodes, ctypes.byref(result_len),
            ctypes.byref(nodes_expanded),
        )
    elapsed_ms = (time.perf_counter() - t0) * 1000

    if distance < 0:
        return jsonify({"error": "No path found between these nodes."}), 404

    # Build path with coordinates
    path = []
    plen = result_len.value
    lat = ctypes.c_double()
    lon = ctypes.c_double()
    for i in range(plen):
        nid = result_nodes[i]
        LIB.graph_node_latlon(GRAPH_HANDLE, nid, ctypes.byref(lat), ctypes.byref(lon))
        path.append({
            "id": nid,
            "lat": round(lat.value, 7),
            "lon": round(lon.value, 7),
        })

    return jsonify({
        "distance_m": round(distance, 1),
        "path": path,
        "stats": {
            "nodes_expanded": nodes_expanded.value,
            "time_ms": round(elapsed_ms, 2),
            "algorithm": algo,
        },
    })


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ok = load_library()
    if not ok:
        print("[WARN] Server starting without graph — some endpoints will return 503.")
    app.run(host="0.0.0.0", port=5000, debug=False)
