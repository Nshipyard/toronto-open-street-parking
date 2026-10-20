#!/usr/bin/env python3
"""Build the joined Toronto Open Curb dataset.

Spine: Toronto Centreline road segments (one output row per segment).
Spatial joins (projected to EPSG:2952 / MTM zone 10 for metric work):
  - bikeways lines within 25 m of the segment AND matching the segment's street
    name (normalized) -> bike_infra_type (a bikeway segment carries one type)
  - permit parking area polygons containing the segment midpoint -> permit_area
  - point sources within 250 m of the segment midpoint: Green P car parks,
    Bike Share stations, curbside CaféTO locations, TPA accessible stalls
    (off-street), city EV chargers; nearest Green P distance.
Name joins (the sources have no geometry, so the street is the finest key):
  - Chapter 950 by-law rules (data/derived/bylaw_rules.csv) aggregated by
    normalized street name -> rule counts per category
  - 2023-2025 parking tickets aggregated from the reference project's raw
    monthly CSVs by normalized street name -> tickets_2023_2025 per street
Facility join:
  - Green P car parks joined to TPA parking occupancy by car park number
    (Green P id "52" <-> occupancy "CP52"); latest quarter wins.

Outputs (data/):
  open_curb_segments.geojson / open_curb_segments.csv
  open_curb_streets.csv         street-level rollup of the segment table
  green_p_facilities.csv        facilities with latest occupancy
  join_log.json                 every join: keys, rows in, matched, match rate
  app_data.json                 compact data for the web app
"""
import csv, glob, json, os, re, sys
from collections import Counter, defaultdict

import ijson
from pyproj import Transformer
from shapely.geometry import shape, Point, MultiLineString, LineString
from shapely.ops import transform as shp_transform
from shapely.strtree import STRtree

BASE = os.path.expanduser("~/workspace/nshipyard-builds/toronto-open-street-parking")
RAW = os.path.join(BASE, "data/raw")
DERIVED = os.path.join(BASE, "data/derived")
DATA = os.path.join(BASE, "data")
TICKET_RAW = os.path.expanduser("~/workspace/toronto-parking-tickets-geocoded/data/raw")
os.makedirs(DERIVED, exist_ok=True)

to2952 = Transformer.from_crs(4326, 2952, always_xy=True).transform
join_log = []

# ---------------------------------------------------------------- names ----
SUFFIX = {
    "STREET": "ST", "AVENUE": "AVE", "ROAD": "RD", "BOULEVARD": "BLVD",
    "DRIVE": "DR", "CRESCENT": "CRES", "COURT": "CT", "PLACE": "PL",
    "LANE": "LN", "TRAIL": "TRL", "PARKWAY": "PKWY", "CIRCLE": "CIR",
    "SQUARE": "SQ", "TERRACE": "TERR", "GARDENS": "GDNS", "HEIGHTS": "HTS",
    "GATE": "GATE", "MEWS": "MEWS", "QUAY": "QUAY", "WAY": "WAY",
    "COMMONS": "COMMONS", "LINE": "LINE", "PROMENADE": "PROM",
    "ESPLANADE": "ESPLANADE", "GROVE": "GROVE", "HILL": "HILL",
}
DIRECTIONS = {"WEST": "W", "EAST": "E", "NORTH": "N", "SOUTH": "S"}

def norm_name(s):
    if not s:
        return ""
    s = re.sub(r"\([^)]*\)", " ", str(s))          # drop "(TO)" etc.
    s = s.upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    toks = [t for t in s.split() if t]
    if not toks:
        return ""
    # expand suffix word wherever it occurs as the type token (usually last or
    # second last, before a direction letter)
    for i, t in enumerate(toks):
        if t in SUFFIX and i >= len(toks) - 2:
            toks[i] = SUFFIX[t]
    if toks[-1] in DIRECTIONS:
        toks[-1] = DIRECTIONS[toks[-1]]
    # "ST CLAIR" keeps ST (saint); "KING STREET W" handled above.
    return " ".join(toks)

def norm_ticket_street(location2):
    s = (location2 or "").strip().upper()
    s = re.sub(r"^\d+[A-Z]?\s+", "", s)            # leading house number
    s = re.sub(r"^\d+\s*-\s*", "", s)              # range start "123-"
    if "/" in s:
        s = s.split("/")[0].strip()                # intersection: first street
    return norm_name(s)

# ------------------------------------------------------------ centreline ----
ROAD_CLASSES = {"Local", "Collector", "Major Arterial", "Minor Arterial",
                "Laneway", "Expressway", "Expressway Ramp", "Other",
                "Pending", "Access Road", "Major Arterial Ramp"}
segments = []          # dicts with shapely geom in 2952 and props
skipped_classes = Counter()
with open(os.path.join(RAW, "centreline_4326.geojson"), "rb") as f:
    for feat in ijson.items(f, "features.item"):
        p = feat.get("properties") or {}
        cls = p.get("FEATURE_CODE_DESC") or ""
        if cls not in ROAD_CLASSES:
            skipped_classes[cls] += 1
            continue
        g = shape(feat["geometry"])
        if g.geom_type == "LineString":
            g = MultiLineString([g])
        gp = shp_transform(to2952, g)
        segments.append({
            "segment_id": p.get("CENTRELINE_ID"),
            "street_name": (p.get("LINEAR_NAME_FULL") or "").strip(),
            "street_norm": norm_name(p.get("LINEAR_NAME_FULL") or ""),
            "linear_name_id": p.get("LINEAR_NAME_ID"),
            "road_class": cls,
            "oneway": (p.get("ONEWAY_DIR_CODE_DESC") or "") not in ("", "Not One-Way"),
            "addr_lo_l": p.get("LO_NUM_L"), "addr_hi_l": p.get("HI_NUM_L"),
            "addr_lo_r": p.get("LO_NUM_R"), "addr_hi_r": p.get("HI_NUM_R"),
            "geom2952": gp,
            "geom4326": g,
            "mid": gp.representative_point(),
            "length_m": gp.length,
        })
n_seg = len(segments)
print(f"centreline road segments: {n_seg} (skipped non-road: {dict(skipped_classes)})", flush=True)
seg_streets = {s["street_norm"] for s in segments if s["street_norm"]}

# --------------------------------------------------------------- points ----
def first_point(geom):
    g = shape(geom)
    if g.geom_type == "Point":
        return g
    if g.geom_type == "MultiPoint":
        return list(g.geoms)[0]
    return g.representative_point()

def load_points_geojson(fn):
    d = json.load(open(os.path.join(RAW, fn)))
    pts = []
    for feat in d["features"]:
        pt = first_point(feat["geometry"])
        pts.append((pt, feat.get("properties") or {}))
    return pts

gp_raw = json.load(open(os.path.join(RAW, "green_p_2019.json")))["carparks"]
green_p = []
for cp in gp_raw:
    try:
        pt = Point(float(cp["lng"]), float(cp["lat"]))
    except (KeyError, TypeError, ValueError):
        continue
    green_p.append((pt, cp))
bs_raw = json.load(open(os.path.join(RAW, "bike_share_station_information.json")))["data"]["stations"]
bike_share = [(Point(s["lon"], s["lat"]), s) for s in bs_raw]
cafe_all = load_points_geojson("cafeto_4326.geojson")
cafe_curb = [(pt, p) for pt, p in cafe_all
             if "CURB LANE" in str(p.get("CATEGORY") or "").upper()
             or "CURB LANE" in str(p.get("INTERVENTION_TYPE") or "").upper()]
acc_pts = load_points_geojson("accessible_stalls_4326.geojson")
ev_pts = load_points_geojson("ev_charging_4326.geojson")
print(f"points: green_p {len(green_p)}, bike_share {len(bike_share)}, "
      f"cafeto total {len(cafe_all)} curb-lane {len(cafe_curb)}, accessible {len(acc_pts)}, ev {len(ev_pts)}", flush=True)

POINT_SETS = {
    "green_p_250m": green_p,
    "bike_share_250m": bike_share,
    "cafeto_curb_lane_250m": cafe_curb,
    "accessible_stalls_250m": acc_pts,
    "ev_chargers_250m": ev_pts,
}
trees = {}
for key, pts in POINT_SETS.items():
    proj = [shp_transform(to2952, pt) for pt, _ in pts]
    trees[key] = (STRtree(proj), proj)

for s in segments:
    mid = s["mid"]
    for key, (tree, proj) in trees.items():
        idx = tree.query(mid, predicate="dwithin", distance=250.0)
        s[key] = len(idx)
    gp_tree, gp_proj = trees["green_p_250m"]
    if len(gp_proj):
        near = gp_tree.nearest(mid)
        s["nearest_green_p_m"] = round(mid.distance(gp_proj[near]))
    else:
        s["nearest_green_p_m"] = ""

# -------------------------------------------------------------- bikeways ----
# Source: Cycling Network (the maintained record, refreshed semi-annually).
# The older Bikeways record is frozen ("Will not be Refreshed") and is NOT the
# same file: 1,323 features vs 1,581, different segment IDs. Cycling Network wins.
bike = json.load(open(os.path.join(RAW, "cycling_network_4326.geojson")))
bike_lines, bike_names, bike_types = [], [], []
for feat in bike["features"]:
    p = feat.get("properties") or {}
    infra = p.get("INFRA_HIGHORDER") or ""
    if infra.startswith("Multi-Use Trail") or infra == "Park Road":
        continue  # off-road paths: not curb lanes
    g = shape(feat["geometry"])
    if g.geom_type == "LineString":
        g = MultiLineString([g])
    bike_lines.append(shp_transform(to2952, g))
    bike_names.append(norm_name(p.get("STREET_NAME") or ""))
    bike_types.append(infra)
bike_tree = STRtree(bike_lines)
bike_matched_segments = 0
bike_matched_lines = set()
for s in segments:
    s["bike_infra_type"] = ""
    cand = bike_tree.query(s["geom2952"], predicate="dwithin", distance=25.0)
    best = None
    for i in cand:
        if bike_names[i] and bike_names[i] == s["street_norm"]:
            d = s["geom2952"].distance(bike_lines[i])
            if best is None or d < best[0]:
                best = (d, i)
    if best:
        s["bike_infra_type"] = bike_types[best[1]]
        bike_matched_segments += 1
        bike_matched_lines.add(best[1])
join_log.append({
    "join": "cycling network -> centreline segments",
    "method": "spatial (line within 25 m) AND normalized street-name equality",
    "left_rows": len(bike_lines), "right_rows": n_seg,
    "matched_left_rows": len(bike_matched_lines),
    "matched_right_rows": bike_matched_segments,
    "match_rate_left": round(len(bike_matched_lines) / max(len(bike_lines), 1), 4),
    "notes": "Off-road cycling features (Multi-Use Trail*, Park Road) excluded before the join: "
             "they do not occupy a parking lane. A cycling line can match several segments. Source is the "
             "Cycling Network record (semi-annual refresh); the frozen Bikeways record carries an older, "
             "different feature set and was not used.",
})
print(f"bikeways: {len(bike_matched_lines)}/{len(bike_lines)} lines matched, {bike_matched_segments} segments", flush=True)

# ------------------------------------------------------- permit areas ----
permit = json.load(open(os.path.join(RAW, "permit_parking_areas_4326.geojson")))
polys, poly_names = [], []
for feat in permit["features"]:
    g = shape(feat["geometry"])
    polys.append(shp_transform(to2952, g))
    poly_names.append((feat.get("properties") or {}).get("AREA_NAME") or "")
poly_tree = STRtree(polys)
in_permit = 0
for s in segments:
    s["permit_area"] = ""
    hit = poly_tree.query(s["mid"], predicate="within")
    if len(hit):
        s["permit_area"] = poly_names[hit[0]]
        in_permit += 1
join_log.append({
    "join": "permit parking areas -> centreline segments",
    "method": "spatial: segment representative point within permit-area polygon",
    "left_rows": len(polys), "right_rows": n_seg,
    "matched_right_rows": in_permit,
    "match_rate_right": round(in_permit / n_seg, 4),
    "notes": "97 permit-area polygons; a segment is in an area when its midpoint falls inside.",
})
print(f"permit areas: {in_permit}/{n_seg} segment midpoints inside a permit area", flush=True)

# ------------------------------------------------------------ by-law rules ----
RULE_CATS = ["no_parking", "no_stopping", "no_standing", "time_limited_parking",
             "commercial_loading", "passenger_loading", "delivery_vehicle_parking",
             "bus_loading", "school_bus_loading", "bus_parking", "taxicab_stand",
             "winter_parking_prohibited", "snow_storm_parking", "carshare_parking",
             "ev_charging_parking", "municipal_parking_facility",
             "permitted_angle_parking", "reserved_lane"]
rules_by_street = defaultdict(Counter)
rules_rows = 0
with open(os.path.join(DERIVED, "bylaw_rules.csv")) as f:
    for row in csv.DictReader(f):
        rules_rows += 1
        rules_by_street[norm_name(row["highway"])][row["category"]] += 1
rule_streets_matched = sum(1 for st in rules_by_street if st in seg_streets)
for s in segments:
    c = rules_by_street.get(s["street_norm"], Counter())
    for cat in RULE_CATS:
        s[f"rules_{cat}"] = c.get(cat, 0)
    s["rules_total"] = sum(c.get(cat, 0) for cat in RULE_CATS)
join_log.append({
    "join": "by-law rules -> centreline segments",
    "method": "normalized street-name equality (rules carry no segment geometry; "
              "30.5k of 77,940 by-law records anchor to an intersection point at best)",
    "left_rows": rules_rows, "distinct_left_streets": len(rules_by_street),
    "matched_left_streets": rule_streets_matched,
    "match_rate_left": round(rule_streets_matched / max(len(rules_by_street), 1), 4),
    "notes": "Counts attach at street level: every segment of a street carries the "
             "street's rule counts. Rule extents (side, between) stay in bylaw_rules.csv.",
})
print(f"rules: {rules_rows} rows, {len(rules_by_street)} streets, {rule_streets_matched} matched", flush=True)

# ---------------------------------------------------------------- tickets ----
TICKET_CACHE = os.path.join(DERIVED, "tickets_by_street.json")
if os.path.exists(TICKET_CACHE):
    _tc = json.load(open(TICKET_CACHE))
    ticket_counts = Counter({k: v for k, v in _tc["counts"].items()})
    ticket_rows = _tc["rows"]
    print(f"tickets: loaded cache ({ticket_rows} rows)", flush=True)
else:
    ticket_counts = Counter()
    ticket_files = sorted(glob.glob(os.path.join(TICKET_RAW, "parking-tickets-20*/*.csv")))
    ticket_rows = 0
    for fn in ticket_files:
        # errors="replace": a few monthly files carry non-UTF8 bytes in locality text;
        # street names are ASCII, so replacement cannot change a join key.
        # Headers are lowercased per file: the 2025 file ships UPPERCASE headers
        # (the 2023/2024 monthly files use lowercase), and blank lines are skipped
        # because the 2025 file starts with one, which otherwise makes DictReader
        # take the blank line as its header and hide all 2.05M rows under a None key.
        with open(fn, newline="", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader((ln for ln in f if ln.strip()))
            if reader.fieldnames:
                reader.fieldnames = [(h or "").strip().lower() for h in reader.fieldnames]
            for row in reader:
                if not (row.get("date_of_infraction") or "").strip().isdigit():
                    continue  # skips a stray repeated header row present in one monthly file
                ticket_rows += 1
                st = norm_ticket_street(row.get("location2"))
                if st:
                    ticket_counts[st] += 1
    json.dump({"rows": ticket_rows, "counts": dict(ticket_counts)}, open(TICKET_CACHE, "w"))
ticket_streets_matched = sum(1 for st in ticket_counts if st in seg_streets)
tickets_on_matched = sum(n for st, n in ticket_counts.items() if st in seg_streets)
for s in segments:
    s["tickets_2023_2025"] = ticket_counts.get(s["street_norm"], 0)
join_log.append({
    "join": "parking tickets 2023-2025 -> centreline segments",
    "method": "street name from ticket location2 (house number stripped, first street "
              "of intersections), normalized, equality with centreline street name",
    "left_rows": ticket_rows, "distinct_left_streets": len(ticket_counts),
    "matched_left_streets": ticket_streets_matched,
    "match_rate_left": round(ticket_streets_matched / max(len(ticket_counts), 1), 4),
    "tickets_on_matched_streets": tickets_on_matched,
    "ticket_coverage": round(tickets_on_matched / max(ticket_rows, 1), 4),
    "notes": "Ticket counts attach at street level. Source files are the reference "
             "project's raw slice (6,454,695 rows of which 6,454,694 carry a valid date), "
             "not re-downloaded.",
})
print(f"tickets: {ticket_rows} rows, {len(ticket_counts)} streets, {ticket_streets_matched} matched, coverage {tickets_on_matched/ticket_rows:.3f}", flush=True)

# -------------------------------------------- green P x occupancy join ----
occ = {}
with open(os.path.join(RAW, "parking_occupancy.csv")) as f:
    for row in csv.DictReader(f):
        num = (row["Car Park Number"] or "").strip()
        key = (int(row["Year"]), int(row["Quarter"][1]))
        occ.setdefault(num, []).append((key, row))
gp_rows = []
gp_matched = 0
for pt, cp in green_p:
    num = "CP" + str(cp.get("id"))
    rows = occ.get(num, [])
    latest = ""
    occ_pct, occ_spaces, occ_period = "", "", ""
    if rows:
        rows.sort(key=lambda x: x[0])
        (yr, q), r = rows[-1]
        occ_period = f"{yr} Q{q}"
        occ_pct = r["Average Daily Peak Occupancy %"]
        occ_spaces = r["Total Available Spaces"]
        gp_matched += 1
    cap = cp.get("capacity") or ""
    gp_rows.append({
        "carpark_id": cp.get("id"), "address": cp.get("address"),
        "lat": round(pt.y, 6), "lon": round(pt.x, 6),
        "type": cp.get("carpark_type_str") or cp.get("carpark_type") or "",
        "capacity": cap, "rate_text": cp.get("rate") or "",
        "rate_half_hour": (cp.get("rate_half_hour") or "").strip(),
        "occupancy_period": occ_period, "occupancy_peak_pct": occ_pct,
        "occupancy_total_spaces": occ_spaces,
    })
join_log.append({
    "join": "parking occupancy -> Green P car parks",
    "method": "car park number equality: Green P id '52' <-> occupancy 'CP52'; latest year/quarter kept",
    "left_rows": len(gp_rows), "matched_left_rows": gp_matched,
    "match_rate_left": round(gp_matched / max(len(gp_rows), 1), 4),
    "notes": "Green P snapshot is from 2019; occupancy runs to the latest published quarter. "
             "Capacity in the two files can differ; both are kept.",
})

# ------------------------------------------------------------- write out ----
FIELDS = (["segment_id", "street_name", "street_norm", "road_class", "oneway",
           "length_m", "addr_lo_l", "addr_hi_l", "addr_lo_r", "addr_hi_r",
           "bike_infra_type", "permit_area"]
          + [f"rules_{c}" for c in RULE_CATS] + ["rules_total", "tickets_2023_2025",
           "green_p_250m", "bike_share_250m", "cafeto_curb_lane_250m",
           "accessible_stalls_250m", "ev_chargers_250m", "nearest_green_p_m"])

def seg_row(s):
    row = {
        "segment_id": s["segment_id"], "street_name": s["street_name"],
        "street_norm": s["street_norm"], "road_class": s["road_class"],
        "oneway": s["oneway"], "length_m": round(s["length_m"], 1),
        "addr_lo_l": s["addr_lo_l"], "addr_hi_l": s["addr_hi_l"],
        "addr_lo_r": s["addr_lo_r"], "addr_hi_r": s["addr_hi_r"],
        "bike_infra_type": s["bike_infra_type"], "permit_area": s["permit_area"],
        "rules_total": s["rules_total"], "tickets_2023_2025": s["tickets_2023_2025"],
        "green_p_250m": s["green_p_250m"], "bike_share_250m": s["bike_share_250m"],
        "cafeto_curb_lane_250m": s["cafeto_curb_lane_250m"],
        "accessible_stalls_250m": s["accessible_stalls_250m"],
        "ev_chargers_250m": s["ev_chargers_250m"],
        "nearest_green_p_m": s["nearest_green_p_m"],
    }
    for cat in RULE_CATS:
        row[f"rules_{cat}"] = s[f"rules_{cat}"]
    return row

with open(os.path.join(DATA, "open_curb_segments.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=FIELDS)
    w.writeheader()
    for s in segments:
        w.writerow(seg_row(s))

with open(os.path.join(DATA, "open_curb_segments.geojson"), "w") as f:
    f.write('{"type":"FeatureCollection","name":"toronto-open-street-parking-segments","features":[')
    first = True
    for s in segments:
        row = seg_row(s)
        coords = []
        for line in s["geom4326"].geoms:
            coords.append([[round(x, 5), round(y, 5)] for x, y in line.coords])
        feat = {"type": "Feature", "properties": row,
                "geometry": {"type": "MultiLineString", "coordinates": coords}}
        if not first:
            f.write(",")
        f.write(json.dumps(feat))
        first = False
    f.write("]}")

# street rollup
streets = {}
for s in segments:
    st = streets.setdefault(s["street_norm"], {
        "street": s["street_name"], "street_norm": s["street_norm"], "segments": 0,
        "length_m": 0.0, "bike_infra_m": 0.0, "permit_segments": 0,
        "tickets_2023_2025": s["tickets_2023_2025"], "rules_total": s["rules_total"],
        "green_p_250m_max": 0, "bike_share_250m_max": 0, "cafeto_250m_max": 0,
    })
    st["segments"] += 1
    st["length_m"] += s["length_m"]
    if s["bike_infra_type"]:
        st["bike_infra_m"] += s["length_m"]
    if s["permit_area"]:
        st["permit_segments"] += 1
    st["green_p_250m_max"] = max(st["green_p_250m_max"], s["green_p_250m"])
    st["bike_share_250m_max"] = max(st["bike_share_250m_max"], s["bike_share_250m"])
    st["cafeto_250m_max"] = max(st["cafeto_250m_max"], s["cafeto_curb_lane_250m"])
street_rows = []
for st in streets.values():
    street_rows.append({
        "street": st["street"], "street_norm": st["street_norm"],
        "segments": st["segments"], "length_km": round(st["length_m"] / 1000, 2),
        "bike_infra_share": round(st["bike_infra_m"] / st["length_m"], 3) if st["length_m"] else 0,
        "permit_share": round(st["permit_segments"] / st["segments"], 3),
        "rules_total": st["rules_total"], "tickets_2023_2025": st["tickets_2023_2025"],
        "green_p_250m_max": st["green_p_250m_max"],
        "bike_share_250m_max": st["bike_share_250m_max"],
        "cafeto_250m_max": st["cafeto_250m_max"],
    })
street_rows.sort(key=lambda r: -r["tickets_2023_2025"])
with open(os.path.join(DATA, "open_curb_streets.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(street_rows[0].keys()))
    w.writeheader()
    w.writerows(street_rows)

with open(os.path.join(DATA, "green_p_facilities.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(gp_rows[0].keys()))
    w.writeheader()
    w.writerows(gp_rows)

summary = {
    "segments": n_seg,
    "streets": len(street_rows),
    "total_length_km": round(sum(s["length_m"] for s in segments) / 1000, 1),
    "segments_with_bike_infra": bike_matched_segments,
    "segments_in_permit_area": in_permit,
    "bylaw_rules_current": rules_rows,
    "ticket_rows": ticket_rows,
    "tickets_on_matched_streets": tickets_on_matched,
    "green_p_facilities": len(gp_rows),
    "green_p_with_occupancy": gp_matched,
    "bike_share_stations": len(bike_share),
    "cafeto_curb_lane": len(cafe_curb),
    "accessible_stalls_offstreet": len(acc_pts),
    "ev_chargers": len(ev_pts),
}
json.dump({"join_log": join_log, "summary": summary},
          open(os.path.join(DERIVED, "join_results.json"), "w"), indent=1)
print(json.dumps(summary, indent=1))
print("JOIN LOG entries:", len(join_log))
