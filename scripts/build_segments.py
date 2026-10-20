#!/usr/bin/env python3
"""Build the web app's per-street segment data and the street rollup JSON.

Inputs (already built by scripts/build_joined.py):
  data/open_curb_segments.csv   one row per centreline segment (50,027)
  data/open_curb_streets.csv    one row per street (13,344)

Outputs:
  data/segments_by_street.json  read server-side by
                                /api/v1/curb/streets/[street]/segments.
                                Keyed by street_norm. Rule counts and ticket
                                counts in the source are street-level (the
                                by-law and the tickets publish no finer
                                location), so they are stored once per street
                                as `rule_categories`, not repeated per segment.
  public/data/streets.json      the street rollup as compact arrays, fetched
                                by the homepage search and table.

Segment array field order (positional, to keep the file compact):
  0 segment_id        8 bike_infra_type ("" when none)
  1 road_class        9 permit_area ("" when none)
  2 oneway (1/0)     10 green_p_250m
  3 length_m         11 bike_share_250m
  4 addr_lo_l        12 cafeto_curb_lane_250m
  5 addr_hi_l        13 accessible_stalls_250m
  6 addr_lo_r        14 ev_chargers_250m
  7 addr_hi_r        15 nearest_green_p_m (null when none)

Street rollup array field order:
  0 street  1 street_norm  2 segments  3 length_km  4 bike_infra_share
  5 permit_share  6 rules_total  7 tickets_2023_2025  8 green_p_250m_max
  9 bike_share_250m_max  10 cafeto_250m_max
"""
import csv
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RULE_CATS = [
    "no_parking", "no_stopping", "no_standing", "time_limited_parking",
    "commercial_loading", "passenger_loading", "delivery_vehicle_parking",
    "bus_loading", "school_bus_loading", "bus_parking", "taxicab_stand",
    "winter_parking_prohibited", "snow_storm_parking", "carshare_parking",
    "ev_charging_parking", "municipal_parking_facility",
    "permitted_angle_parking", "reserved_lane",
]


def num(v):
    if v is None or v == "":
        return None
    f = float(v)
    return int(f) if f == int(f) else f


def main():
    seg_path = os.path.join(BASE, "data", "open_curb_segments.csv")
    streets = {}
    with open(seg_path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            norm = r["street_norm"]
            entry = streets.get(norm)
            if entry is None:
                entry = streets[norm] = {
                    "street": r["street_name"],
                    "rule_categories": {},
                    "segments": [],
                }
            cats = entry["rule_categories"]
            for c in RULE_CATS:
                v = int(r[f"rules_{c}"] or 0)
                if v > cats.get(c, 0):
                    cats[c] = v
            entry["segments"].append([
                int(r["segment_id"]),
                r["road_class"],
                1 if r["oneway"].lower() == "true" else 0,
                num(r["length_m"]),
                num(r["addr_lo_l"]), num(r["addr_hi_l"]),
                num(r["addr_lo_r"]), num(r["addr_hi_r"]),
                r["bike_infra_type"] or "",
                r["permit_area"] or "",
                int(r["green_p_250m"] or 0),
                int(r["bike_share_250m"] or 0),
                int(r["cafeto_curb_lane_250m"] or 0),
                int(r["accessible_stalls_250m"] or 0),
                int(r["ev_chargers_250m"] or 0),
                num(r["nearest_green_p_m"]),
            ])
    for entry in streets.values():
        entry["rule_categories"] = {
            k: v for k, v in entry["rule_categories"].items() if v > 0
        }
        entry["segments"].sort(key=lambda s: s[0])

    out = os.path.join(BASE, "data", "segments_by_street.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(streets, f, ensure_ascii=False, separators=(",", ":"))
    total_segs = sum(len(e["segments"]) for e in streets.values())
    print(f"wrote {out}: {len(streets)} streets, {total_segs} segments, "
          f"{os.path.getsize(out)} bytes")

    roll_path = os.path.join(BASE, "data", "open_curb_streets.csv")
    rows = []
    with open(roll_path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append([
                r["street"], r["street_norm"], int(r["segments"]),
                float(r["length_km"]), float(r["bike_infra_share"]),
                float(r["permit_share"]), int(r["rules_total"]),
                int(r["tickets_2023_2025"]), int(r["green_p_250m_max"]),
                int(r["bike_share_250m_max"]), int(r["cafeto_250m_max"]),
            ])
    out2 = os.path.join(BASE, "public", "data", "streets.json")
    with open(out2, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {out2}: {len(rows)} streets, {os.path.getsize(out2)} bytes")


if __name__ == "__main__":
    main()
