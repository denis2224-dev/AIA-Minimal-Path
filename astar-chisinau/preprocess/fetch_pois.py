#!/usr/bin/env python3
# Fetch hospitals, pharmacies, and emergency stations from Overpass API
# and save as data/pois.json

import os
import sys
import json

try:
    import requests
except ImportError:
    print("ERROR: 'requests' library not found. Install it with: pip install requests")
    sys.exit(1)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
BBOX = "46.97,28.77,47.08,28.88"

OVERPASS_QUERY = f"""
[out:json][timeout:60];
(
  // Hospitals
  node["amenity"="hospital"]({BBOX});
  way["amenity"="hospital"]({BBOX});
  relation["amenity"="hospital"]({BBOX});

  // Clinics
  node["amenity"="clinic"]({BBOX});
  way["amenity"="clinic"]({BBOX});

  // Pharmacies
  node["amenity"="pharmacy"]({BBOX});
  way["amenity"="pharmacy"]({BBOX});

  // Emergency stations (fire, ambulance)
  node["amenity"="fire_station"]({BBOX});
  way["amenity"="fire_station"]({BBOX});
  node["emergency"="ambulance_station"]({BBOX});
  way["emergency"="ambulance_station"]({BBOX});

  // Doctors
  node["amenity"="doctors"]({BBOX});
  way["amenity"="doctors"]({BBOX});
);
out center;
"""

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

def classify(tags):
    # Classify a POI into a category based on its OSM tags
    amenity = tags.get("amenity", "")
    emergency = tags.get("emergency", "")

    if amenity == "hospital":
        return "hospital"
    elif amenity == "clinic" or amenity == "doctors":
        return "clinic"
    elif amenity == "pharmacy":
        return "pharmacy"
    elif amenity == "fire_station" or emergency == "ambulance_station":
        return "emergency_station"
    return None


def main():
    print(f"[1/3] Fetching POIs from Overpass API...")
    resp = requests.post(OVERPASS_URL, data={"data": OVERPASS_QUERY}, timeout=60)
    resp.raise_for_status()
    data = resp.json()

    elements = data.get("elements", [])
    print(f"       Got {len(elements)} raw elements.")

    pois = []
    seen = set()

    for el in elements:
        tags = el.get("tags", {})
        category = classify(tags)
        if category is None:
            continue

        # Get coordinates
        if el["type"] == "node":
            lat = el.get("lat")
            lon = el.get("lon")
        else:
            center = el.get("center", {})
            lat = center.get("lat")
            lon = center.get("lon")

        if lat is None or lon is None:
            continue

        # Deduplicate
        key = f"{category}-{round(lat, 4)}-{round(lon, 4)}"
        if key in seen:
            continue
        seen.add(key)

        name = tags.get("name", tags.get("name:en", tags.get("name:ro", "")))

        pois.append({
            "lat": round(lat, 7),
            "lon": round(lon, 7),
            "name": name,
            "category": category,
        })

    # Count POIs by category
    counts = {}
    for p in pois:
        counts[p["category"]] = counts.get(p["category"], 0) + 1

    print(f"[2/3] Parsed {len(pois)} unique POIs:")
    for cat, count in sorted(counts.items()):
        print(f"       - {cat}: {count}")

    # Write to JSON file
    os.makedirs(DATA_DIR, exist_ok=True)
    out_path = os.path.join(DATA_DIR, "pois.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(pois, f, ensure_ascii=False, indent=2)

    print(f"[3/3] Wrote {out_path}")


if __name__ == "__main__":
    main()
