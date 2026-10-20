#!/usr/bin/env python3
"""Build the curb dataset inventory from CKAN package metadata.

The catalogue was searched on 2026-10-20 with 51 keyword queries in two passes (see search_queries in the output). 371 distinct datasets
matched at least one query, mostly on words inside their descriptions
(a "street" in an address, "parking" in a survey). The inventory below is
the curated subset whose records describe the curb itself: who may park,
stop or load, where, when, at what price, what physically occupies or
closes the curb, the street geometry the curb attaches to, or observed
enforcement and use of it. Each entry states its join status for this
project: joined (how), or not joined (why).

Outputs: data/inventory.json, data/inventory.csv
"""
import csv, json, os

BASE = os.path.expanduser("~/workspace/nshipyard-builds/toronto-open-street-parking")
META = json.load(open("data/raw/ckan_meta.json"))
JOINED = json.load(open(os.path.join(BASE, "data/derived/join_results.json"))) \
    if os.path.exists(os.path.join(BASE, "data/derived/join_results.json")) else None

QUERIES = ["parking", "curb", "snow", "loading", "bike lane", "bicycle", "street",
           "green p", "no parking", "stopping", "permit", "centreline", "sign",
           "marking", "stall", "meter", "taxi", "vehicle for hire", "bikeshare",
           "bike share", "winter", "sidewalk", "road", "traffic",
           "accessible parking", "pay and display", "on-street", "parking space",
           "road classification", "pavement", "curbside", "tow", "enforcement",
           "loading zone", "truck route", "snow route", "winter maintenance",
           "snow clearing", "plow", "no stopping", "no standing",
           "curb lane", "patio", "street occupation", "road occupancy permit",
           "accessible", "carshare", "rideshare", "designated", "traffic bylaw",
           "by-law schedule"]

# ckan_id -> (curb attributes, geometry, joined status, join role / why not, notes)
SPEC = {
    "toronto-centreline-tcl": (["where"], "Lines (MultiLineString)",
        "joined", "spine: one output row per road segment (50,027 of 64,392 features; trails, rivers, railways and walkways excluded)",
        "Carries the street name, road class, one-way flag and address ranges for both sides of every segment. It does not carry the street's parking itself: no lane counts, no parking side, no stall positions."),
    "traffic-and-parking-by-law-schedules": (["who", "where", "when"], "None (text; 52.9% of kept rules carry one intersection anchor point)",
        "joined", "rules layer: 27,768 current street parking rules flattened to CSV and counted per street name",
        "Chapter 950 schedules. One JSON resource of 806.5 MB holds all 77,940 regulation records, current and repealed. Locations are legal text (street, side, between). Times are text ('Anytime', '7:00 a.m. to 9:00 a.m., Mon. to Fri.'). No segment geometry in any record."),
    "parking-tickets": (["enforcement", "where", "when"], "None (street addresses in text)",
        "joined", "observed enforcement: 6,454,695 tickets (2023-2025 reference slice) aggregated by street name and attached to every segment of the street",
        "The enforcement record is fully open. Tickets locate to a street address; the reference project geocoded 86.9% of the slice to address points."),
    "on-street-permit-parking-area-maps": (["who", "where"], "Polygons (MultiPolygon)",
        "joined", "permit layer: segment midpoint in polygon test against 97 permit-area polygons",
        "Permit areas are polygons with area codes (e.g. 12B). The file names the areas; permit rules (hours, prices) are not in it."),
    "bikeways": (["blocks", "where"], "Lines (MultiLineString)",
        "not joined", "frozen duplicate of the cycling network: the record's refresh rate is 'Will not be Refreshed', and the file is not the same as Cycling Network (1,323 features vs 1,581, different segment IDs). The maintained Cycling Network file was joined instead",
        "Kept in the inventory because a search for the bike network returns both records and nothing states which is canonical."),
    "cycling-network": (["blocks", "where"], "Lines (MultiLineString)",
        "joined", "bike layer: on-road lines within 25 m of a segment with the same street name set the segment's bike_infra_type (923 on-road features of 1,581)",
        "The maintained cycling network record (semi-annual refresh, modified 2026-09-14). Off-road multi-use trails were excluded from the join because they do not occupy a parking lane."),
    "green-p-parking": (["price", "where", "who"], "Points",
        "joined", "facility layer: 252 car parks with address, capacity and rate text; segment rows count car parks within 250 m and distance to the nearest",
        "CKAN refresh rate is 'Will not be Refreshed': the resource used is the 2019 snapshot. Rates are text strings (e.g. '$2.50 / Half Hour'), not numbers with units. Off-street only."),
    "parking-occupancy": (["use", "price"], "None (table)",
        "joined", "use layer: joined to Green P car parks by car park number (CP52 style); latest quarter kept",
        "Average daily peak occupancy per TPA off-street facility by quarter. Off-street only: there is no equivalent for on-street spaces."),
    "bike-share-toronto": (["blocks", "where"], "Points (live GBFS feed)",
        "joined", "1,070 stations from the GBFS station_information feed the dataset points to; segment rows count stations within 250 m",
        "The CKAN entry is a pointer to the live GBFS feed, not a file. Station capacity is in the feed."),
    "cafeto-curb-lane-parklet-cafe-locations": (["blocks", "where", "when"], "Points (MultiPoint)",
        "joined", "287 of 1,636 locations are parking-lane cafés or parklets; segment rows count them within 250 m",
        "CaféTO locations record the season's licensed parking-lane and sidewalk cafés. CKAN excerpt calls them historical locations."),
    "off-street-parking-surface-lots-accessible-stalls": (["who", "where"], "Points (MultiPoint)",
        "joined", "669 accessible stalls at TPA surface lots; segment rows count them within 250 m",
        "Stall-level coordinates exist here, but only for accessible stalls in off-street surface lots. Source note says positions come from 2024 aerial photography."),
    "taxicab-stand-locations": (["who", "where", "when"], "None (spreadsheet of text locations)",
        "not joined", "February 2014 snapshot, no coordinates: street, side and a text location per stand. The current stands are in the by-law schedules (Schedule 05, 159 current rules), which were joined instead",
        "112 stands listed. The dataset is 12 years stale relative to the by-law file."),
    "city-operated-electric-vehicle-charging-station-map": (["who", "where"], "Points (MultiPoint)",
        "joined", "82 city EV charging locations; segment rows count them within 250 m",
        "Most locations are in Green P facilities (off-street). The by-law schedules add 59 current EV-charging parking rules by street name."),
    "residential-front-yard-parking": (["who", "where"], "None (addresses in a table)",
        "not joined", "licensed front-yard and boulevard parking pads are tabulated by address (about 0.8 MB CSV) with licensed space counts; no geometry is published, and pads sit off the roadway",
        "Included because it is a parking permission the city sells; it describes the boulevard, not the parking lane."),
    "free-floating-carshare-program": (["who"], "None (web link only)",
        "not joined", "the dataset has a single WEB resource and no downloadable file, so there is nothing to join; designated car-share parking areas exist as 48 current by-law rules (Schedule 43) and were joined through the rules layer",
        "A programme description page standing in for a dataset."),
    "sidewalk-inventory": (["where"], "Lines (shapefile only)",
        "not joined", "shapefile-only resource (9.7 MB), inventoried for completeness; sidewalk presence borders the street parking but does not allocate it",
        "Says sidewalks are keyed to the city centreline, so a join is possible in future work."),
    "topographic-mapping-edge-of-road": (["where"], "Polygons",
        "not joined", "the physical roadway extent as polygons (244 MB GeoJSON); inventoried, not downloaded, because it adds pavement extent only, no street parking allocation",
        "Collected from aerial photography. This is the closest public layer to the edge of the street, and it still contains no parking information."),
    "topographic-mapping-physical-area-of-parking-lots": (["where"], "Polygons",
        "not joined", "polygons of parking lot areas (155 MB GeoJSON); lot outlines without stall lines, prices or operators",
        "Shows that lot areas are mapped from the air while the stalls inside them are not published."),
    "topographic-mapping-physical-area-of-sidewalks": (["where"], "Polygons",
        "not joined", "sidewalk area polygons; same reasoning as edge-of-road",
        ""),
    "one-way-streets": (["where"], "Lines (shapefile only)",
        "not joined", "duplicates the one-way flag already on every centreline segment (ONEWAY_DIR_CODE_DESC), so it adds nothing to the join",
        ""),
    "intersection-file-city-of-toronto": (["where"], "Points",
        "not joined", "centreline intersection nodes; the by-law rules anchor to these IDs in 52.9% of kept rules, but the anchor is a point, not the rule's extent",
        ""),
    "road-restrictions": (["blocks", "when"], "Feed (JSON/CSV/XML, no stated geometry)",
        "not joined", "a live feed of current closures; it says what blocks a street today, but records are point-in-time and the feed is not archived as a dataset file",
        "Useful for operations; not a stable join source."),
    "street-furniture-transit-shelter": (["blocks", "where"], "Points",
        "not joined", "transit shelters stand on the sidewalk or boulevard beside the parking lane; inventoried as street furniture, not joined because shelters do not allocate the parking lane",
        "Part of a street furniture family (benches, litter bins, poster structures) published as separate datasets."),
    "street-furniture-bicycle-parking": (["blocks", "where"], "Points",
        "not joined", "bicycle locking rings in the right-of-way; same reasoning as transit shelters",
        "Replaced the retired bicycle post and ring dataset."),
    "bicycle-parking-racks": (["blocks", "where"], "Points",
        "not joined", "multi-bike racks; same reasoning as transit shelters",
        ""),
    "bicycle-post-and-ring-locations": (["blocks", "where"], "Points",
        "not joined", "retired dataset (notes say so); replaced by street furniture bicycle parking",
        "Kept in the inventory because a search for bicycle parking still returns it."),
    "parking-lot-facilities": (["where", "price"], "None (spreadsheet)",
        "not joined", "Parks, Forestry and Recreation parking lots; the resource is a Q3 2016 spreadsheet, nine-plus years stale",
        ""),
    "private-transportation-companies-summary-and-trip-data": (["use"], "None (tables and sampled trips)",
        "not joined", "ride-hail trip aggregates show street parking demand (pickups and drop-offs), but trips are aggregated and the full files are yearly zips of 28-55 MB; inventoried as demand evidence",
        "Trip-level pickup points would describe street parking demand directly; the published sample is 1.3 MB."),
    "traffic-control-devices": (["where"], "Points",
        "not joined", "devices are signals and related equipment, upcoming or recently activated only; it contains no parking signs",
        "Read carefully: this is the dataset a searcher expects to hold the sign inventory. It does not."),
    "traffic-signals-tabular": (["where"], "Points",
        "not joined", "traffic signal, beacon and crossover locations; no parking signs",
        ""),
    "turn-restrictions": (["where", "when"], "Lines",
        "not joined", "retired in 2018 (notes say so); current turn rules live in the by-law schedules (Schedules 23 and 24)",
        ""),
    "10-year-cycling-network-plan-on-street-2016": (["where"], "Lines (shapefile only)",
        "not joined", "the 2016 plan for on-street cycling routes; a plan, not the built network (bikeways carries the built network)",
        ""),
    "solid-waste-daytime-curbside-collection-areas": (["blocks", "when"], "Polygons (shapefile only)",
        "not joined", "daytime curbside collection areas; collection trucks occupy the parking lane on collection days, but the file gives areas, not days per street",
        ""),
    "merged-gtfs-ttc-routes-and-schedules": (["who", "where", "when"], "GTFS (zip of text files)",
        "not joined", "TTC stops are street space allocations for transit; the GTFS zip carries stop points and schedules. Inventoried; a stop-level join is future work",
        "Bus loading zones also appear as 20 current by-law rules (Schedule 10) and 551 school bus loading rules (Schedule 37)."),
}

rows = []
for pid, (attrs, geom, joined, role, notes) in SPEC.items():
    r = META.get(pid)
    if not r or r.get("_error"):
        print(f"!! missing metadata for {pid}"); continue
    fmts = sorted({(res.get("format") or "?") for res in r["resources"]})
    rows.append({
        "ckan_id": pid,
        "title": r["title"],
        "publisher": (r.get("organization") or {}).get("title", ""),
        "owner_division": r.get("owner_division", ""),
        "last_updated": (r.get("metadata_modified") or "")[:10],
        "last_refreshed": (r.get("last_refreshed") or "")[:10],
        "refresh_rate": r.get("refresh_rate", ""),
        "formats": fmts,
        "num_resources": len(r["resources"]),
        "geometry": geom,
        "curb_attributes": attrs,
        "joined": joined,
        "join_role": role,
        "notes": notes,
        "catalogue_url": f"https://open.toronto.ca/dataset/{pid}/",
    })

out = {
    "built": "2026-10-20",
    "catalogue": "City of Toronto Open Data (CKAN), searched via https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search (the open.toronto.ca/api/3 path returns 404; the CKAN host is the working endpoint)",
    "search_queries": QUERIES,
    "total_keyword_hits": 371,
    "curb_datasets_inventoried": len(rows),
    "datasets": rows,
}
json.dump(out, open(os.path.join(BASE, "data/inventory.json"), "w"), indent=1)
with open(os.path.join(BASE, "data/inventory.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["ckan_id", "title", "publisher", "owner_division", "last_updated",
                "last_refreshed", "refresh_rate", "formats", "num_resources",
                "geometry", "curb_attributes", "joined", "join_role", "notes",
                "catalogue_url"])
    for r in rows:
        w.writerow([r["ckan_id"], r["title"], r["publisher"], r["owner_division"],
                    r["last_updated"], r["last_refreshed"], r["refresh_rate"],
                    ";".join(r["formats"]), r["num_resources"], r["geometry"],
                    ";".join(r["curb_attributes"]), r["joined"], r["join_role"],
                    r["notes"], r["catalogue_url"]])
print(f"inventory rows: {len(rows)}")
for r in rows:
    print(f"  {r['ckan_id']:52} {r['joined']:10} refresh={r['refresh_rate']}")
