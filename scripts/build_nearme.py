#!/usr/bin/env python3
"""Build the small per-street summary the homepage "Near me" list reads.

Input:
  data/segments_by_street.json   per-street rule counts by kind, and one row
                                 per street section whose last field is the
                                 distance in metres to the nearest Green P
                                 car park (null when none was recorded).

Output:
  public/data/streets_near.json  { street_norm: [no_stopping, no_parking,
                                 time_limited, nearest_green_p_m | null] }

The Near me list joins this file to the street shapes in
public/data/streets_map.geojson on the street name, in the browser. The
street's nearest Green P distance is the smallest section value: the
closest section of the street to a Green P car park sets the street's
distance. Streets missing from the segments file get no entry; the page
treats a missing entry as zero rules and no Green P distance, and says so
by leaving the Green P line out.
"""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    with open(os.path.join(BASE, "data", "segments_by_street.json")) as f:
        by_street = json.load(f)

    out = {}
    for norm, entry in by_street.items():
        cats = entry.get("rule_categories") or {}
        nearest = None
        for seg in entry.get("segments") or []:
            v = seg[-1]
            if v is not None and (nearest is None or v < nearest):
                nearest = v
        out[norm] = [
            int(cats.get("no_stopping", 0)),
            int(cats.get("no_parking", 0)),
            int(cats.get("time_limited_parking", 0)),
            nearest,
        ]

    path = os.path.join(BASE, "public", "data", "streets_near.json")
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print("wrote", path, len(out), "streets,", os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
