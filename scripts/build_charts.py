#!/usr/bin/env python3
"""Compute every number on the /charts page from this project's own files.

Inputs:
  data/app_data.json        the join log (match rates per source)
  public/data/streets.json  the street rollup, one row per street:
    [street, street_norm, segments, length_km, bike_share, permit_share,
     rules_total, tickets, green_p_250m_max, bike_share_250m_max,
     cafeto_250m_max]

Output:
  src/lib/charts-data.json  imported by src/app/charts/page.tsx

Nothing here is estimated: match rates come from the join log itself, and
the street charts are counted from the rollup rows.
"""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pct(part, whole):
    return round(1000 * part / whole) / 10 if whole else 0.0


def main():
    with open(os.path.join(BASE, "data", "app_data.json")) as f:
        app = json.load(f)
    with open(os.path.join(BASE, "public", "data", "streets.json")) as f:
        rows = json.load(f)

    joins = {j["join"]: j for j in app["joins"]}
    tk = joins["Parking tickets 2023-2025 matched to street sections"]
    cy = joins["Bike lanes matched to street sections"]
    ru = joins["Parking rules matched to street sections"]
    gp = joins["Parking occupancy matched to Green P car parks"]
    pe = joins["Permit parking areas matched to street sections"]
    # Rates are computed from the raw counts in the join log, not from the
    # log's pre-rounded rate fields.
    match = [
        {"source": "tickets", "rate": pct(tk["tickets_on_matched_streets"], tk["left_rows"])},
        {"source": "cycling", "rate": pct(cy["matched_left_rows"], cy["left_rows"])},
        {"source": "rules", "rate": pct(ru["matched_left_streets"], ru["distinct_left_streets"])},
        {"source": "greenp", "rate": pct(gp["matched_left_rows"], gp["left_rows"])},
        {"source": "permit", "rate": pct(pe["matched_right_rows"], pe["right_rows"])},
    ]

    total = len(rows)
    top15 = [
        {"street": r[0], "rules": r[6]}
        for r in sorted(rows, key=lambda r: (-r[6], r[0]))[:15]
    ]
    coverage = [
        {"key": "rules", "count": sum(1 for r in rows if r[6] > 0)},
        {"key": "tickets", "count": sum(1 for r in rows if r[7] > 0)},
        {"key": "bike", "count": sum(1 for r in rows if r[4] > 0)},
        {"key": "permit", "count": sum(1 for r in rows if r[5] > 0)},
        {"key": "greenp", "count": sum(1 for r in rows if r[8] > 0)},
    ]
    for c in coverage:
        c["share"] = pct(c["count"], total)

    buckets = [
        {"key": "b0", "count": sum(1 for r in rows if r[6] == 0)},
        {"key": "b1", "count": sum(1 for r in rows if 1 <= r[6] <= 5)},
        {"key": "b2", "count": sum(1 for r in rows if 6 <= r[6] <= 20)},
        {"key": "b3", "count": sum(1 for r in rows if 21 <= r[6] <= 50)},
        {"key": "b4", "count": sum(1 for r in rows if r[6] > 50)},
    ]

    data = {"totalStreets": total, "match": match, "top15": top15, "coverage": coverage, "buckets": buckets}
    path = os.path.join(BASE, "src", "lib", "charts-data.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=1)
    print("wrote", path)
    print(json.dumps(data, indent=1))


if __name__ == "__main__":
    main()
