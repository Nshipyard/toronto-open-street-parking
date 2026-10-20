#!/usr/bin/env python3
"""Assemble data/app_data.json for the web app from the built datasets,
and write the data dictionary."""
import csv, json, os

BASE = os.path.expanduser("~/workspace/nshipyard-builds/toronto-open-street-parking")
DATA = os.path.join(BASE, "data")

JOIN = json.load(open(os.path.join(DATA, "derived/join_results.json")))
INV = json.load(open(os.path.join(DATA, "inventory.json")))

GAPS = [
    {
        "id": "stall-level-inventory",
        "kind": "missing",
        "title": "Individual paid parking stalls have no public coordinates",
        "claim": "The Toronto Parking Authority manages about 21,000 paid on-street spaces worth $67.7 million a year (TPA 2026 Operating Budget). No public dataset lists those spaces one by one: no stall coordinates, no stall boundaries, no locations for meters or pay-and-display machines. Parking policy operates at stall level (the same budget math values one lost metered spot at about $3,200 a year), and stall level is the level that is missing.",
        "evidence": "Catalogue searches on 2026-10-20 for 'stall', 'parking space', 'meter', 'pay and display', and 'curb' returned no stall inventory. The only stall-level coordinates in the catalogue are 669 accessible stalls in off-street surface lots. SenSen's published case study, 'Digitising the Streets of Toronto: AI-powered Curb Mapping' (sensen.ai), says its drive-by cameras document 'the location and state of parking signs' and identify 'physical curb assets such as meters and stalls', feeding the city's digital curb inventory for the Parking Authority. That inventory is not on open.toronto.ca.",
    },
    {
        "id": "rules-have-no-geometry",
        "kind": "text-only",
        "title": "Parking rules are published as legal text, not as locations",
        "claim": "Toronto publishes its street parking rules in full: 77,940 records across the schedules of Municipal Code Chapter 950. A rule names the street, the side of the street, and an extent in words ('Between a point 53 metres east of York Street and a point 36 metres east'). It does not give coordinates for where the rule starts and ends. Times and days are text strings ('Anytime', '7:00 a.m. to 9:00 a.m., Mon. to Fri.'), so no machine can answer 'can I park on this block at 8 a.m. on Tuesday' from the published file alone.",
        "evidence": "This project streamed the dataset's single 806.5 MB JSON resource and extracted 27,768 current rules in 18 street parking categories (13,914 records are marked repealed and were dropped). 52.9% of the kept rules carry one intersection anchor point, a single lat/lon at a cross street. The other 47.1% carry no coordinates at all, and no record carries the geometry of the rule's extent. The rules therefore joined to streets by name, not to segments.",
    },
    {
        "id": "snow-routes",
        "kind": "missing",
        "title": "Snow routes are not published",
        "claim": "In the February 2025 storm, the Parking Authority closed 47% of its on-street inventory for snow removal and recorded 371,000 fewer transactions. Which streets are plowed in which order, and which parking lanes are treated as closed in a storm, is not published as data a resident or a developer can use before or during a storm.",
        "evidence": "Catalogue searches for 'snow route', 'winter maintenance', 'snow clearing', and 'plow' returned zero datasets on 2026-10-20. What exists instead is by-law text: Schedule 04 carries 2,632 winter-maintenance parking prohibitions for the former City of North York, and Schedules 17A and 17B add 176 snow-storm rules. Plow positions appear on the City's PlowTO web map during storms; the route data behind it is not in the catalogue. Storm figures: TPA 2026 Operating Budget report.",
    },
    {
        "id": "on-street-occupancy",
        "kind": "partial",
        "title": "Occupancy is published for parking lots, not for street parking",
        "claim": "The Parking Authority publishes average daily peak occupancy for its off-street facilities, by quarter: 780 facility-quarter rows that this project joined to Green P car parks. For on-street spaces, no occupancy series exists at any level: not by stall, not by street, not by zone. Debates about whether street parking prices are too high or too low run without a published measure of how full street parking is.",
        "evidence": "The Parking Occupancy dataset's own notes limit it to off-street facilities operated by the TPA. A catalogue search for 'occupancy' returns that file and unrelated housing datasets. The joined dataset in this project can attach lot occupancy to 252 car parks; it can attach no occupancy at all to 50,027 street segments.",
    },
    {
        "id": "on-street-rates",
        "kind": "partial",
        "title": "Prices are published per parking lot, as text. On-street prices are not data.",
        "claim": "Green P publishes a price for each of its 252 off-street car parks as a text string (for example '$2.50 / Half Hour'), with a numeric half-hour rate beside it. On-street paid parking, the $67.7 million a year side of the system, has no published rate table by street or zone in the catalogue. Current on-street prices live on signs, on the Green P website, and in the Green P app.",
        "evidence": "A catalogue search for 'pay and display' returned 24 keyword hits and no rate dataset. The Green P resource used here is a 2019 snapshot whose catalogue record says refresh rate 'Will not be Refreshed', so even the off-street prices in open data can be years old. Rates in the joined Green P facility file are reproduced as published, text included.",
    },
    {
        "id": "sign-inventory",
        "kind": "missing",
        "title": "The parking sign inventory is not published",
        "claim": "Every street parking rule reaches a driver through a sign. The City holds a sign-level record of its streets: SenSen's system documents the location and state of parking signs for the Parking Authority, with repeat drive-bys tracking changes and obstructions. No dataset publishes parking sign locations, so a missing, faded, or contradicted sign cannot be checked against a public record.",
        "evidence": "The catalogue's Traffic Control Devices dataset covers signals and related devices, upcoming or recently activated only, and contains no parking signs. Searches for 'sign' return sign by-law districts, a third-party (billboard) sign inventory, and building-permit signs. The only public statement of the sign inventory's existence is the SenSen case study, which describes it as an operational asset of the Parking Authority.",
    },
    {
        "id": "taxicab-stands-stale",
        "kind": "stale",
        "title": "Taxicab stands are published as a February 2014 spreadsheet",
        "claim": "The catalogue's taxicab stand dataset is a spreadsheet dated February 2014: 112 stands, each with a street, a side, a text location, and a stand capacity. It has no coordinates. The stands in force today exist as by-law text in Schedule 05 of Chapter 950 (159 current rules).",
        "evidence": "The file's first row states 'Toronto taxicab stand locations as of February 2014' and cites Chapter 950, Schedule 5 as its source. This project joined the current by-law rules by street name instead, and records the spreadsheet in the inventory as not joined: stale and coordinate-free.",
    },
    {
        "id": "accessible-on-street",
        "kind": "missing",
        "title": "Accessible parking is located for lots, not for streets",
        "claim": "Toronto publishes the coordinates of 669 accessible stalls, all of them in off-street surface lots run by the Parking Authority. No dataset locates accessible parking on the street itself, and the published by-law schedules contain no accessible-parking schedule at all.",
        "evidence": "The Off-Street Parking, Surface Lots, Accessible Stalls dataset is scoped to TPA lots in its title and notes. A search of all 190 rows of the Chapter 950 schedule tally built for this project finds no schedule for accessible or disabled parking. Accessible-permit holders park under the general permit rules; where a signed accessible space exists on a street, it is not in any public file this search found.",
    },
]

S = JOIN["summary"]
summary = {
    "built": "2026-10-20",
    "datasets_inventoried": INV["curb_datasets_inventoried"],
    "datasets_joined": sum(1 for r in INV["datasets"] if r["joined"] == "joined"),
    "segments": S["segments"],
    "streets": S["streets"],
    "total_length_km": S["total_length_km"],
    "segments_with_bike_infra": S["segments_with_bike_infra"],
    "segments_in_permit_area": S["segments_in_permit_area"],
    "bylaw_rules_current": S["bylaw_rules_current"],
    "bylaw_records_total": 77940,
    "rules_with_anchor": 14685,
    "ticket_rows": S["ticket_rows"],
    "tickets_on_matched_streets": S["tickets_on_matched_streets"],
    "green_p_facilities": S["green_p_facilities"],
    "green_p_with_occupancy": S["green_p_with_occupancy"],
    "bike_share_stations": S["bike_share_stations"],
    "cafeto_curb_lane": S["cafeto_curb_lane"],
    "accessible_stalls_offstreet": S["accessible_stalls_offstreet"],
    "ev_chargers": S["ev_chargers"],
    "gaps_documented": len(GAPS),
}

streets = list(csv.DictReader(open(os.path.join(DATA, "open_curb_streets.csv"))))
for r in streets:
    for k in ("segments", "rules_total", "tickets_2023_2025", "green_p_250m_max",
              "bike_share_250m_max", "cafeto_250m_max"):
        r[k] = int(r[k])
    for k in ("length_km", "bike_infra_share", "permit_share"):
        r[k] = float(r[k])
top = streets[:25]

gp = list(csv.DictReader(open(os.path.join(DATA, "green_p_facilities.csv"))))
gp_out = []
for r in gp:
    if r["occupancy_peak_pct"]:
        gp_out.append({
            "carpark_id": r["carpark_id"], "address": r["address"], "type": r["type"],
            "capacity": r["capacity"], "rate_text": r["rate_text"],
            "occupancy_period": r["occupancy_period"],
            "occupancy_peak_pct": r["occupancy_peak_pct"],
        })
gp_out.sort(key=lambda r: -int(r["occupancy_peak_pct"].rstrip("%") or 0))

app = {
    "summary": summary,
    "inventory": INV["datasets"],
    "joins": JOIN["join_log"],
    "gaps": GAPS,
    "streets": streets,
    "topStreets": top,
    "greenP": gp_out[:12],
}
json.dump(app, open(os.path.join(DATA, "app_data.json"), "w"))
print(f"app_data.json: {len(streets)} streets, {len(INV['datasets'])} inventory rows, "
      f"{len(JOIN['join_log'])} joins, {len(GAPS)} gaps, summary segments={summary['segments']}")

# ------------------------------------------------------- data dictionary ----
DICT_ROWS = [
    ("segment_id", "Centreline segment identifier (CENTRELINE_ID). One row is one block-length piece of a street between two intersections.", "Toronto Centreline (TCL)", "spine"),
    ("street_name", "Street name as printed in the Centreline file, e.g. 'Queen St W'.", "Toronto Centreline (TCL)", "spine"),
    ("street_norm", "Normalized street name used as the join key for every name-based join: uppercased, street types abbreviated, district markers removed.", "derived in this project", "normalization of street_name"),
    ("road_class", "Centreline feature class: Local, Collector, Major Arterial, Minor Arterial, Laneway, Expressway, and related road classes. Trails, rivers, railways and walkways were removed before the join.", "Toronto Centreline (TCL)", "spine filter"),
    ("oneway", "True when the Centreline one-way direction code is anything other than 'Not One-Way'.", "Toronto Centreline (TCL)", "spine"),
    ("length_m", "Segment length in metres, computed from the segment geometry in EPSG:2952.", "derived in this project", "geometry measure"),
    ("addr_lo_l / addr_hi_l / addr_lo_r / addr_hi_r", "Lowest and highest street numbers on the left and right sides of the segment, where the Centreline carries them. The address range is the finest published hint of where along a street something sits.", "Toronto Centreline (TCL)", "spine"),
    ("bike_infra_type", "Cycling infrastructure type on this segment (Bike Lane, Cycle Track, Sharrows, and so on), blank when none joined. Off-road trails were excluded: they do not occupy a parking lane.", "Cycling Network", "spatial: cycling line within 25 m AND same normalized street name"),
    ("permit_area", "On-street permit parking area code (e.g. 12B) when the segment's midpoint falls inside a permit-area polygon, blank otherwise.", "On-Street Permit Parking Area Maps", "spatial: midpoint in polygon"),
    ("rules_<category>", "Count of current Chapter 950 street parking rules in a category that name this segment's street. Categories: no_parking, no_stopping, no_standing, time_limited_parking, commercial_loading, passenger_loading, delivery_vehicle_parking, bus_loading, school_bus_loading, bus_parking, taxicab_stand, winter_parking_prohibited, snow_storm_parking, carshare_parking, ev_charging_parking, municipal_parking_facility, permitted_angle_parking, reserved_lane. Counts are street-level: the by-law has no segment geometry, so every segment of a street carries the street's counts.", "Traffic and Parking By-Law Schedules", "street-name equality on street_norm"),
    ("rules_total", "Sum of rules_<category> across the 18 categories.", "derived in this project", "sum"),
    ("tickets_2023_2025", "Parking tickets written on this segment's street in 2023-2025. Street-level: tickets publish a street address, not a segment.", "Parking Tickets (2023-2025 slice from the toronto-parking-tickets-geocoded project)", "street-name equality on street_norm, address stripped of its house number"),
    ("green_p_250m", "Green P car parks within 250 m of the segment's midpoint.", "Green P Parking (2019 snapshot)", "spatial: point within 250 m of midpoint"),
    ("bike_share_250m", "Bike Share Toronto stations within 250 m of the segment's midpoint.", "Bike Share Toronto (live GBFS station feed)", "spatial: point within 250 m of midpoint"),
    ("cafeto_curb_lane_250m", "CaféTO locations (parking-lane cafés and parklets) within 250 m of the segment's midpoint.", "CaféTO Locations", "spatial: point within 250 m of midpoint"),
    ("accessible_stalls_250m", "TPA accessible stalls in off-street surface lots within 250 m of the segment's midpoint.", "Off-Street Parking, Surface Lots, Accessible Stalls", "spatial: point within 250 m of midpoint"),
    ("ev_chargers_250m", "City-operated EV charging locations within 250 m of the segment's midpoint.", "City Operated Electric Vehicle Charging Station Map", "spatial: point within 250 m of midpoint"),
    ("nearest_green_p_m", "Distance in metres from the segment's midpoint to the nearest Green P car park.", "Green P Parking (2019 snapshot)", "spatial: nearest point"),
    ("geometry (GeoJSON only)", "Segment line in WGS84, coordinates rounded to 5 decimal places.", "Toronto Centreline (TCL)", "spine"),
]
with open(os.path.join(DATA, "data_dictionary.md"), "w") as f:
    f.write("# Data dictionary: toronto-open-street-parking joined segment dataset\n\n")
    f.write("One row per Toronto Centreline road segment (50,027 rows). Fields, what they mean, "
            "which dataset each field came from, and the join that attached it. "
            "Fields marked street-level attach the same value to every segment of a street, "
            "because the source publishes no finer location.\n\n")
    f.write("| Field | Definition | Source dataset | Join path |\n|---|---|---|---|\n")
    for name, definition, source, how in DICT_ROWS:
        f.write(f"| {name} | {definition} | {source} | {how} |\n")
    f.write("\n## Companion files\n\n")
    f.write("- `green_p_facilities.csv`: 252 Green P car parks with address, type, capacity, "
            "published rate text, and the latest quarter of TPA parking occupancy, joined by car park "
            "number (Green P id 52 to occupancy CP52).\n")
    f.write("- `bylaw_rules.csv`: the 27,768 current Chapter 950 street parking rules, one row per rule, with "
            "street, side, extent text, times text, category, and an intersection anchor point where "
            "the source carries one.\n")
    f.write("- `inventory.csv` / `inventory.json`: the 34 inventoried curb datasets with catalogue "
            "metadata, curb attributes, and join status.\n")
    f.write("- `open_curb_streets.csv`: the segment table rolled up to one row per street.\n")
with open(os.path.join(DATA, "data_dictionary.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["field", "definition", "source_dataset", "join_path"])
    w.writerows(DICT_ROWS)
print("data dictionary written")
