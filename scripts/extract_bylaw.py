#!/usr/bin/env python3
"""Stream the 806MB Chapter 950 by-law schedules JSON and extract current curb rules.

Source: CKAN dataset traffic-and-parking-by-law-schedules, single JSON resource
(OData-style: {"@odata.count": 77940, "value": [...]}). Records carry tableData
key/value pairs (Highway, Side, Between/Location, Times and or Days, ...),
scheduleDisplayName, latestRegulationActionByStatus, and geoData (in some records
an intersection anchor point, never segment geometry).

A rule is kept when:
  - its schedule is one of the curb schedules of Chapter 950 (CATEGORIES below), and
  - its latest action is not "Repealed" (13,914 records are explicitly repealed;
    46,455 records carry an empty latest-action status and are treated as current,
    a stated assumption: empty is not proof of force, only "Repealed" is proof of removal).

Outputs:
  data/raw/bylaw_tally.csv       counts by schedule x latest action status (all schedules)
  data/derived/bylaw_rules.csv   the kept rules, flattened, with category
Also prints geoData coverage among kept rules.
"""
import csv, json, os, re
import ijson
from collections import Counter

BASE = os.path.expanduser("~/workspace/nshipyard-builds/toronto-open-street-parking")
SRC = os.path.join(BASE, "data/raw/bylaw_schedules.json")
OUT_TALLY = os.path.join(BASE, "data/raw/bylaw_tally.csv")
OUT_RULES = os.path.join(BASE, "data/derived/bylaw_rules.csv")
os.makedirs(os.path.dirname(OUT_RULES), exist_ok=True)

CATEGORIES = {
    "04": "winter_parking_prohibited",   # former North York winter maintenance
    "05": "taxicab_stand",
    "06": "commercial_loading",
    "07": "passenger_loading",
    "08": "bus_parking",
    "09": "delivery_vehicle_parking",
    "10": "bus_loading",
    "12": "permitted_angle_parking",
    "13": "no_parking",
    "14": "no_stopping",
    "15": "time_limited_parking",
    "16": "no_standing",
    "17": "snow_storm_parking",          # 17A majorsnow, 17B streetcar tracks
    "22": "reserved_lane",
    "34": "municipal_parking_facility",
    "37": "school_bus_loading",
    "43": "carshare_parking",
    "44": "ev_charging_parking",
}

def schedule_num(display):
    m = re.match(r"Schedule\s+(\d+)", display or "")
    return m.group(1) if m else ""

tally = Counter()
statuses = Counter()
total = 0
kept = 0
kept_geodata = 0
cat_counts = Counter()

fout = open(OUT_RULES, "w", newline="")
w = csv.writer(fout)
w.writerow(["rule_id", "category", "schedule", "schedule_name", "highway", "side", "between",
            "location", "times_and_or_days", "prohibited_times_and_or_days",
            "maximum_period_permitted", "designated_class_of_vehicle",
            "number_of_taxicabs", "latest_action", "effective_date", "expiry_date",
            "geo_anchor_lat", "geo_anchor_lon"])

with open(SRC, "rb") as f:
    for rec in ijson.items(f, "value.item"):
        total += 1
        sched = rec.get("scheduleDisplayName") or ""
        status = rec.get("latestRegulationActionByStatus") or ""
        tally[(sched, status)] += 1
        statuses[status] += 1
        num = schedule_num(sched)
        if num not in CATEGORIES or status == "Repealed":
            continue
        td = {}
        for kv in rec.get("tableData") or []:
            k = (kv.get("key") or "").strip().lower()
            v = kv.get("value")
            if k and v:
                td[k] = str(v).strip()
        highway = td.get("highway") or td.get("highways") or ""
        gd = rec.get("geoData") or []
        lat = lon = ""
        if isinstance(gd, list) and gd and isinstance(gd[0], dict):
            lat = str(gd[0].get("lat") or "")
            lon = str(gd[0].get("lon") or "")
            if lat and lon:
                kept_geodata += 1
        w.writerow([
            rec.get("id", ""), CATEGORIES[num], sched, rec.get("scheduleName") or "",
            highway, td.get("side", ""), td.get("between", ""), td.get("location", ""),
            td.get("times and or days", "") or td.get("time and or days", ""),
            td.get("prohibited times and or days", "") or td.get("prohibited hours and or days", ""),
            td.get("maximum period permitted", "") or td.get("maximum period parking", ""),
            td.get("designated class of vehicle", ""), td.get("number of taxicabs", ""),
            status, rec.get("regulationEffectiveDateMax") or "",
            rec.get("regulationExpiryDateMax") or "", lat, lon,
        ])
        kept += 1
        cat_counts[CATEGORIES[num]] += 1
        if total % 20000 == 0:
            print(f"  ...{total} scanned, {kept} kept", flush=True)

fout.close()
with open(OUT_TALLY, "w", newline="") as f2:
    w2 = csv.writer(f2)
    w2.writerow(["schedule", "latest_action_status", "records"])
    for (s, st), n in sorted(tally.items(), key=lambda kv: -kv[1]):
        w2.writerow([s, st, n])

print(f"TOTAL RECORDS: {total}")
print(f"STATUSES: {dict(statuses)}")
print(f"CURB RULES KEPT: {kept}")
print(f"KEPT RULES WITH INTERSECTION ANCHOR (geoData lat/lon): {kept_geodata} "
      f"({100.0*kept_geodata/max(kept,1):.1f}%)")
print("BY CATEGORY:", json.dumps(dict(cat_counts), indent=1))
