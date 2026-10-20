#!/usr/bin/env python3
"""Download every source resource the joins use, from the CKAN URLs recorded
in data/raw/ckan_meta.json (plus the live Bike Share GBFS station feed that
the bike-share-toronto dataset points to).

Notes from the 2026-10-20 build:
- The by-law schedules JSON is 806,521,833 bytes; the egress proxy cut the
  first transfer at 478 MB, so the download resumes with curl -C - until the
  byte count matches.
- The Bike Share CKAN resources are pointers: the gbfs discovery document
  names the station_information feed at tor.publicbikesystem.net.
- The Cycling Network GeoJSON is fetched the same way (it is the maintained
  record; the frozen 'Bikeways' record is a different, older feature set).
Run: python3 scripts/fetch_sources.py
"""
import json, os, subprocess

BASE = os.path.expanduser("~/workspace/nshipyard-builds/toronto-open-street-parking")
RAW = os.path.join(BASE, "data/raw")
META = json.load(open(os.path.join(RAW, "ckan_meta.json")))
os.makedirs(RAW, exist_ok=True)

BYLAW_LEN = 806521833

def pick(pid, fmt=None, name_contains=None):
    for res in META[pid]["resources"]:
        if fmt and (res.get("format") or "").lower() != fmt.lower():
            continue
        if name_contains and name_contains.lower() not in (res.get("name") or "").lower():
            continue
        return res["url"]
    raise SystemExit(f"resource not found: {pid} {fmt} {name_contains}")

def get(url, fname):
    path = os.path.join(RAW, fname)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        print(f"skip (exists) {fname}"); return path
    print(f"downloading {fname}", flush=True)
    subprocess.run(["curl", "-sL", "--retry", "3", "-o", path, url], check=True)
    print(f"  {os.path.getsize(path)/1e6:.1f} MB")
    return path

def get_resumable(url, fname, want_len):
    path = os.path.join(RAW, fname)
    for attempt in range(10):
        size = os.path.getsize(path) if os.path.exists(path) else 0
        if size >= want_len:
            break
        print(f"downloading {fname} from byte {size} (attempt {attempt+1})", flush=True)
        subprocess.run(["curl", "-s", "-C", "-", "-o", path, url])
    size = os.path.getsize(path)
    assert size == want_len, f"{fname}: got {size} bytes, expected {want_len}"
    print(f"  complete: {size} bytes")

get_resumable(pick("traffic-and-parking-by-law-schedules", "JSON"), "bylaw_schedules.json", BYLAW_LEN)
get(pick("toronto-centreline-tcl", "GeoJSON", "4326.geojson"), "centreline_4326.geojson")
get(pick("cycling-network", "GeoJSON", "4326.geojson"), "cycling_network_4326.geojson")
get(pick("on-street-permit-parking-area-maps", "GeoJSON", "4326.geojson"), "permit_parking_areas_4326.geojson")
get(pick("green-p-parking", "JSON", "2019"), "green_p_2019.json")
get(pick("cafeto-curb-lane-parklet-cafe-locations", "GeoJSON", "4326.geojson"), "cafeto_4326.geojson")
get(pick("taxicab-stand-locations", "XLS"), "taxicab_stands.xls")
get(pick("off-street-parking-surface-lots-accessible-stalls", "GeoJSON", "4326.geojson"), "accessible_stalls_4326.geojson")
get(pick("parking-occupancy", "CSV"), "parking_occupancy.csv")
get(pick("city-operated-electric-vehicle-charging-station-map", "GeoJSON", "4326.geojs"), "ev_charging_4326.geojson")
get("https://tor.publicbikesystem.net/ube/gbfs/v1/en/station_information", "bike_share_station_information.json")
print("ALL SOURCES PRESENT")
