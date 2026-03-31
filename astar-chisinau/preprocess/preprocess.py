#!/usr/bin/env python3
"""
OSM → CSV preprocessing pipeline for the Rîșcani sector of Chișinău.

Downloads street data from the Overpass API, parses nodes and ways,
computes Haversine edge weights, keeps only the largest SCC,
re-indexes node IDs to 0..N-1, and writes nodes.csv + edges.csv.
"""

import os
import sys
import math
import csv
import xml.etree.ElementTree as ET
from collections import defaultdict

try:
    import requests
except ImportError:
    print("ERROR: 'requests' library not found. Install it with: pip install requests")
    sys.exit(1)

# ── Constants ────────────────────────────────────────────────────────────────

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY = """
[out:xml][timeout:60];
(
  way["highway"]["highway"!~"footway|steps|path|cycleway"](47.03,28.82,47.07,28.87);
  >;
);
out body;
"""

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
RAW_OSM_PATH = os.path.join(DATA_DIR, "raw.osm")
NODES_CSV_PATH = os.path.join(DATA_DIR, "nodes.csv")
EDGES_CSV_PATH = os.path.join(DATA_DIR, "edges.csv")

EARTH_RADIUS_M = 6_371_000  # meters


# ── Haversine ────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    """Return the great-circle distance in meters between two points."""
    rlat1, rlon1 = math.radians(lat1), math.radians(lon1)
    rlat2, rlon2 = math.radians(lat2), math.radians(lon2)
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return EARTH_RADIUS_M * 2 * math.asin(math.sqrt(a))


# ── Download OSM data ────────────────────────────────────────────────────────

def download_osm():
    """Download raw OSM XML via the Overpass API and save to data/raw.osm."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(RAW_OSM_PATH):
        print(f"[INFO] {RAW_OSM_PATH} already exists — skipping download.")
        return
    print("[INFO] Downloading OSM data from Overpass API …")
    resp = requests.post(OVERPASS_URL, data={"data": OVERPASS_QUERY}, timeout=120)
    resp.raise_for_status()
    with open(RAW_OSM_PATH, "w", encoding="utf-8") as f:
        f.write(resp.text)
    print(f"[INFO] Saved {len(resp.text)} bytes → {RAW_OSM_PATH}")


# ── Parse OSM XML ────────────────────────────────────────────────────────────

def parse_osm():
    """
    Parse raw.osm and return:
      nodes  – dict  osm_id → (lat, lon)
      edges  – list  (u_osm, v_osm, weight_m)
      names  – dict  osm_id → street name (may be partial; best-effort)
    """
    print("[INFO] Parsing OSM XML …")
    tree = ET.parse(RAW_OSM_PATH)
    root = tree.getroot()

    # Collect nodes
    nodes = {}
    for elem in root.iter("node"):
        nid = int(elem.attrib["id"])
        lat = float(elem.attrib["lat"])
        lon = float(elem.attrib["lon"])
        nodes[nid] = (lat, lon)

    # Collect ways → edges
    edges = []
    names = {}  # osm_node_id → street name (from the way that contains it)

    for way in root.iter("way"):
        # Read tags
        tags = {}
        for tag in way.findall("tag"):
            tags[tag.attrib["k"]] = tag.attrib["v"]

        street_name = tags.get("name", "")
        oneway = tags.get("oneway", "no") in ("yes", "1", "true")

        nd_refs = [int(nd.attrib["ref"]) for nd in way.findall("nd")]

        for ref in nd_refs:
            if ref in nodes and ref not in names and street_name:
                names[ref] = street_name

        for i in range(len(nd_refs) - 1):
            u, v = nd_refs[i], nd_refs[i + 1]
            if u not in nodes or v not in nodes:
                continue
            lat1, lon1 = nodes[u]
            lat2, lon2 = nodes[v]
            dist = int(round(haversine(lat1, lon1, lat2, lon2)))
            if dist == 0:
                dist = 1  # avoid zero-weight edges
            edges.append((u, v, dist))
            if not oneway:
                edges.append((v, u, dist))

    print(f"[INFO] Parsed {len(nodes)} nodes, {len(edges)} directed edges")
    return nodes, edges, names


# ── Largest SCC (Kosaraju's algorithm) ───────────────────────────────────────

def largest_scc(node_set, edges):
    """
    Compute SCCs using Kosaraju's algorithm (iterative DFS).
    Returns a set of node IDs belonging to the largest SCC.
    """
    print("[INFO] Computing strongly-connected components …")

    # Build adjacency and reverse adjacency
    adj = defaultdict(list)
    radj = defaultdict(list)
    for u, v, _ in edges:
        adj[u].append(v)
        radj[v].append(u)

    # Pass 1: iterative DFS on original graph → finish order
    visited = set()
    finish_order = []

    for start in node_set:
        if start in visited:
            continue
        stack = [(start, False)]
        while stack:
            node, processed = stack.pop()
            if processed:
                finish_order.append(node)
                continue
            if node in visited:
                continue
            visited.add(node)
            stack.append((node, True))
            for nb in adj[node]:
                if nb not in visited:
                    stack.append((nb, False))

    # Pass 2: iterative DFS on reverse graph in reverse finish order
    visited2 = set()
    components = []

    for start in reversed(finish_order):
        if start in visited2:
            continue
        comp = []
        stack = [start]
        while stack:
            node = stack.pop()
            if node in visited2:
                continue
            visited2.add(node)
            comp.append(node)
            for nb in radj[node]:
                if nb not in visited2:
                    stack.append(nb)
        components.append(comp)

    components.sort(key=len, reverse=True)
    biggest = set(components[0])
    print(f"[INFO] Found {len(components)} SCCs — largest has {len(biggest)} nodes")
    return biggest


# ── Re-index & write CSV ─────────────────────────────────────────────────────

def write_csv(nodes, edges, names, keep_set):
    """
    Re-index nodes in keep_set to 0..N-1, filter edges, write CSVs.
    """
    # Build osm_id → internal_id mapping
    sorted_ids = sorted(keep_set)
    osm_to_int = {osm_id: idx for idx, osm_id in enumerate(sorted_ids)}

    os.makedirs(DATA_DIR, exist_ok=True)

    # Write nodes.csv
    with open(NODES_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "lat", "lon", "name"])
        for osm_id in sorted_ids:
            lat, lon = nodes[osm_id]
            name = names.get(osm_id, "")
            w.writerow([osm_to_int[osm_id], f"{lat:.7f}", f"{lon:.7f}", name])

    # Write edges.csv (only edges where both endpoints are in the SCC)
    edge_count = 0
    with open(EDGES_CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["u", "v", "weight_m"])
        for u, v, wt in edges:
            if u in keep_set and v in keep_set:
                w.writerow([osm_to_int[u], osm_to_int[v], wt])
                edge_count += 1

    print(f"[INFO] Wrote {len(sorted_ids)} nodes → {NODES_CSV_PATH}")
    print(f"[INFO] Wrote {edge_count} edges → {EDGES_CSV_PATH}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    download_osm()
    nodes, edges, names = parse_osm()

    node_set = set(nodes.keys())
    # Keep only nodes that participate in at least one edge
    edge_nodes = set()
    for u, v, _ in edges:
        edge_nodes.add(u)
        edge_nodes.add(v)
    node_set &= edge_nodes

    keep = largest_scc(node_set, edges)
    write_csv(nodes, edges, names, keep)

    print("\n══════════════════════════════════")
    print(f"  Nodes in graph : {len(keep)}")
    print(f"  Edges in graph : sum of directed edges in edges.csv")
    print("══════════════════════════════════")
    print("Done ✓")


if __name__ == "__main__":
    main()
