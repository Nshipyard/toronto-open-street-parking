#!/usr/bin/env python3
"""Build the homepage map file: one simplified geometry per street.

Input:
  data/open_curb_segments.geojson   one feature per street section (50,027),
                                     MultiLineString geometry in WGS84.
  data/open_curb_streets.csv        the street rollup (tickets, length,
                                     bike-lane share per street).
  data/segments_by_street.json      per-street rule counts by type.

Output:
  public/data/streets_map.geojson   one feature per street (13,344): all of
                                     the street's sections merged into a single
                                     MultiLineString, simplified with a
                                     Douglas-Peucker tolerance in metres and
                                     coordinates rounded to 5 decimals.
                                     Properties: street, norm, tickets
                                     (2023-2025), tpk (tickets per km),
                                     norules (no-parking + no-stopping rule
                                     count), bike (share of the street with
                                     bike lanes, 0-1).

The tolerance starts at 12 m and rises until the file is under ~6 MB, so the
map stays light enough to load in a browser. This derived file is committed to
git (the 60 MB source file is not).
"""
import csv
import json
import math
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_BYTES = 6_000_000
TOLERANCES_M = [12, 18, 25, 35, 50]

# Approximate metres per degree around Toronto (lat 43.7).
M_PER_DEG_LON = 111320 * math.cos(math.radians(43.7))
M_PER_DEG_LAT = 110960


def project(pt):
    return (pt[0] * M_PER_DEG_LON, pt[1] * M_PER_DEG_LAT)


def dp_keep(points, tol):
    """Douglas-Peucker: return the set of indices to keep."""
    n = len(points)
    if n <= 2:
        return set(range(n))
    keep = {0, n - 1}
    stack = [(0, n - 1)]
    proj = [project(p) for p in points]
    while stack:
        a, b = stack.pop()
        ax, ay = proj[a]
        bx, by = proj[b]
        dx, dy = bx - ax, by - ay
        seg_len = math.hypot(dx, dy)
        worst, worst_d = -1, tol
        for i in range(a + 1, b):
            px, py = proj[i]
            if seg_len == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * (px - ax) - dx * (py - ay)) / seg_len
            if d > worst_d:
                worst, worst_d = i, d
        if worst >= 0:
            keep.add(worst)
            stack.append((a, worst))
            stack.append((worst, b))
    return keep


def simplify_line(line, tol):
    if len(line) <= 2:
        return line
    keep = dp_keep(line, tol)
    out = []
    for i, pt in enumerate(line):
        if i in keep:
            r = [round(pt[0], 5), round(pt[1], 5)]
            if not out or out[-1] != r:
                out.append(r)
    if len(out) < 2:
        out = [[round(line[0][0], 5), round(line[0][1], 5)],
               [round(line[-1][0], 5), round(line[-1][1], 5)]]
    return out


def load_inputs():
    streets_csv = {}
    with open(os.path.join(BASE, "data", "open_curb_streets.csv"),
              newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            streets_csv[r["street_norm"]] = r

    seg = json.load(open(os.path.join(BASE, "data", "segments_by_street.json"),
                         encoding="utf-8"))
    norules = {}
    for norm, entry in seg.items():
        cats = entry.get("rule_categories", {})
        norules[norm] = int(cats.get("no_parking", 0)) + int(cats.get("no_stopping", 0))

    gj = json.load(open(os.path.join(BASE, "data", "open_curb_segments.geojson"),
                        encoding="utf-8"))
    parts = {}   # norm -> list of lines
    names = {}   # norm -> display name
    for feat in gj["features"]:
        props = feat["properties"]
        norm = props["street_norm"]
        names.setdefault(norm, props["street_name"])
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or []
        if geom.get("type") == "LineString":
            coords = [coords]
        bucket = parts.setdefault(norm, [])
        for line in coords:
            if len(line) >= 2:
                bucket.append(line)
    return streets_csv, norules, parts, names


def build(parts, names, streets_csv, norules, tol):
    features = []
    for norm, lines in parts.items():
        merged = [simplify_line(line, tol) for line in lines]
        merged = [l for l in merged if len(l) >= 2]
        if not merged:
            continue
        row = streets_csv.get(norm, {})
        tickets = int(row.get("tickets_2023_2025") or 0)
        length_km = float(row.get("length_km") or 0)
        bike = float(row.get("bike_infra_share") or 0)
        features.append({
            "type": "Feature",
            "properties": {
                "street": names.get(norm, norm.title()),
                "norm": norm,
                "tickets": tickets,
                "tpk": round(tickets / length_km, 1) if length_km else 0,
                "norules": norules.get(norm, 0),
                "bike": round(bike, 3),
            },
            "geometry": {"type": "MultiLineString", "coordinates": merged},
        })
    features.sort(key=lambda f: f["properties"]["norm"])
    return {"type": "FeatureCollection", "features": features}


def main():
    streets_csv, norules, parts, names = load_inputs()
    print(f"loaded {len(parts)} streets from the segment file")
    out_path = os.path.join(BASE, "public", "data", "streets_map.geojson")
    for tol in TOLERANCES_M:
        fc = build(parts, names, streets_csv, norules, tol)
        blob = json.dumps(fc, ensure_ascii=False, separators=(",", ":"))
        size = len(blob.encode("utf-8"))
        print(f"tolerance {tol} m -> {len(fc['features'])} streets, {size} bytes")
        if size <= TARGET_BYTES or tol == TOLERANCES_M[-1]:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(blob)
            print(f"wrote {out_path}: {size} bytes at {tol} m tolerance")
            break


if __name__ == "__main__":
    main()
