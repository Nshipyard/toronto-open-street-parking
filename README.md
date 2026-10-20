# Parking rules and tickets for all 13,344 Toronto streets

**Toronto takes in $67.7 million a year from about 21,000 paid street parking spaces, and does not publish where any of them are.**

This page is the public record instead: one entry for every street, with the parking rules that apply to it, the tickets written on it, its bike lanes and its permit areas, covering all 13,344 streets and 50,027 street segments, searchable street by street. The map of the paid spaces exists. The city paid a contractor to build it with camera cars. It is not open data. It is the first of the 8 gaps listed on this page, each with the search evidence behind it.

An [Open Nshipyard](https://canada.nshipyard.com) civic data project. Not affiliated with the City of Toronto.

![Desktop screenshot](docs/screenshots/desktop.png)
![Mobile screenshot](docs/screenshots/mobile.png)

## Why this exists

The Toronto Parking Authority manages about 21,000 paid on-street spaces worth $67.7 million a year and about 41,000 off-street spaces worth $97.4 million (TPA 2026 Operating Budget). One lost metered spot is about $3,200 a year in forgone revenue at those rates. In the February 2025 storm, the Authority closed 47% of its on-street inventory for snow removal and recorded 371,000 fewer transactions.

The City knows its street parking asset by asset. SenSen, under contract to the Parking Authority, drives the streets with cameras that document the location and state of parking signs and identify meters, stalls, and obstructions, feeding a digital street parking inventory (SenSen case study, "Digitising the Streets of Toronto: AI-powered Curb Mapping", sensen.ai). That inventory is not published. The enforcement data is open; the asset registry is closed. This project measures the gap precisely: what the public data can build, and what it cannot.

## What was built

1. **An inventory of street parking data** (`data/inventory.json`, `data/inventory.csv`): 34 datasets from the City of Toronto Open Data catalogue that describe street parking, each with its CKAN id, formats, geometry, last update, refresh rate as stated in the catalogue, the street parking questions it answers (who may park, where, when, at what price, what blocks it, how it is used, how it is enforced), and its join status with the reason.
2. **A combined open street parking dataset** (`data/open_curb_segments.geojson`, `data/open_curb_segments.csv`): one row per Toronto Centreline road segment (50,027 rows, 6,461.6 km of road), carrying bike infrastructure, permit-parking area, current by-law rule counts by category, 2023-2025 ticket counts, and counts of nearby Green P car parks, Bike Share stations, CaféTO parking-lane cafés, accessible stalls, and EV chargers, plus the distance to the nearest Green P car park. Street rollup: `data/open_curb_streets.csv` (13,344 streets). Field definitions: `data/data_dictionary.md`.
3. **The flattened by-law rules** (`data/derived/bylaw_rules.csv`): 27,768 current street parking rules from Municipal Code Chapter 950, one row per rule, with street, side, extent text, times text, category, and an intersection anchor point where the source carries one.
4. **Green P facilities with occupancy** (`data/green_p_facilities.csv`): 252 car parks with capacity and published rate text, joined to the latest quarter of TPA parking occupancy by car park number.
5. **A gap report** (in the web app and below): 8 documented gaps.
6. **A web app** in the Open Nshipyard family pattern, bilingual (EN/FR). The homepage opens on the combined dataset itself: the combined-file downloads sit directly under the hero, then an interactive street map (every street coloured by parking tickets, no-parking rules, or bike lanes; clicking a street opens its profile), then a street search (type a street name, get its combined profile and every one of its segments with the combined attributes on each), then the full 13,344-street rollup as a sortable, searchable table. The map geometry is `public/data/streets_map.geojson`, one merged and simplified geometry per street built by `scripts/build_map.py` from the segment GeoJSON (12 m simplification tolerance, 4.9 MB). Below that: the gap report, the developer surfaces, and, near the bottom under "Where the data came from", the source inventory with what each dataset added and the combination match rates. Per-street segment data is served lazily from `data/segments_by_street.json` (built by `scripts/build_segments.py`) through `GET /api/v1/curb/streets/{street}/segments`; the street rollup is served as a static file at `/data/streets.json`. REST API under `/api/v1/curb/*`, an OpenAPI spec at `/api/openapi.json`, and MCP tools at `/mcp`.
7. **A "Near me" finder on the homepage**: a button under the map asks the browser for the visitor's position (the position never leaves the browser), centres the map on it, and lists every street whose shape comes within 500 m, nearest first, with its no-stopping, no-parking and time-limited rule counts, whether it sits in a permit parking area, and the distance to the nearest Green P car park where the data has one. Clicking a street in the list opens the same street profile as the search. Distances are computed in the browser by `src/lib/nearme.ts` (the visitor and each street shape are projected onto a flat metre grid centred on the visitor; a street's distance is the smallest point-to-segment distance to its shape). The geometry choice: the distance pass reuses `public/data/streets_map.geojson`, the file the map itself already downloaded, so the browser serves it from cache and no second geometry file exists. The rule counts come from `public/data/streets_near.json` (built by `scripts/build_nearme.py` from `data/segments_by_street.json`: per street, the three rule counts and the smallest per-section nearest-Green-P distance). Rule counts are whole-street counts, and the list says so: the bylaw data cannot place a rule on one spot.
8. **A charts page** (`/charts`, linked in the nav): four charts drawn only from this project's files. The match-rate bars come from the join log in `data/app_data.json`; the top-15 streets by rule count, the per-street coverage shares, and the rules-per-street histogram are counted from the street rollup. All numbers are computed by `scripts/build_charts.py` into `src/lib/charts-data.json`; the page draws plain SVG bars from that file. Each chart carries one takeaway sentence and a source note, in English and French like the rest of the site.

## The join log

Every join, its key, and its rate (computed, not estimated):

| Join | Key | Result |
|---|---|---|
| Cycling Network → centreline segments | Spatial: line within 25 m, and the same normalized street name | 880 of 923 on-road lines matched (95.3%); 4,933 segments carry bike infrastructure |
| Permit parking areas → centreline segments | Spatial: segment midpoint inside one of 97 permit-area polygons | 12,164 of 50,027 segments (24.3%) |
| By-law rules → centreline segments | Normalized street-name equality (the rules have no segment geometry) | Rules name 6,836 distinct streets; 5,921 matched a centreline street (86.6%). Counts attach at street level |
| Parking tickets 2023-2025 → centreline segments | Street name from the ticket address (house number stripped), normalized | 6,454,694 tickets with valid dates; 6,348,001 (98.3%) sit on streets the centreline names; 9,358 of 20,211 ticket street strings matched |
| Parking occupancy → Green P car parks | Car park number (Green P id 52 → occupancy CP52), latest quarter kept | 149 of 252 car parks matched (59.1%) |

Left out, with reasons in the inventory: the frozen Bikeways record (a different, older feature set than Cycling Network; the maintained record was combined instead), the February 2014 taxicab spreadsheet (stale, no coordinates; the current stands were combined through the by-law rules), the 244 MB edge-of-road polygons (pavement extent only, no street parking allocation), datasets with no downloadable resource (free-floating carshare), and street furniture (shelters, bike racks) that does not allocate the parking lane.

## The gap report

A gap is listed only where a search backs it. The catalogue was searched through the CKAN API on October 20, 2026, with 51 queries; 371 datasets matched a keyword, and 34 describe street parking itself.

1. **Where the paid parking spaces are is not published** (missing). No data file lists the roughly 21,000 paid on-street spaces one by one: no space coordinates, no meter or pay-and-display locations. Searches for "stall", "parking space", "meter", "pay and display", and "curb" returned no list of individual spaces; the only published space coordinates are 669 accessible spaces in off-street lots. The SenSen case study is the evidence the space-by-space record exists, held by the Parking Authority.
2. **Parking rules are published as legal text, not as places on a map** (text only). The by-law schedules file is one 806.5 MB JSON of 77,940 records. A rule gives street, side, and an extent in words. 52.9% of current street parking rules carry one intersection anchor point; 47.1% carry no coordinates; none carries the geometry of its extent. Times are text, so "can I park here at 8 a.m. on Tuesday" cannot be computed from the file.
3. **Snow routes are not published** (missing). Searches for "snow route", "winter maintenance", "snow clearing", and "plow" returned zero data files. What exists is by-law text: 2,632 winter-maintenance parking prohibitions for the former City of North York (Schedule 04) and 176 snow-storm rules (Schedules 17A, 17B). Plow positions appear on the PlowTO web map during storms; the routes behind it are not open data.
4. **How full parking is gets published for parking lots, not for street parking** (partial). Parking Occupancy covers TPA off-street facilities only, 780 facility-quarter rows. No on-street occupancy series exists at any level.
5. **Prices are published per parking lot, as text. Street parking prices are not published as data** (partial). Green P rates are text strings ("$2.50 / Half Hour") in a 2019 snapshot the catalogue marks "Will not be Refreshed". No rate table by street or zone exists for on-street paid parking.
6. **Where the parking signs are is not published** (missing). Traffic Control Devices covers signals, upcoming or recently activated, and contains no parking signs. The sign-by-sign record SenSen maintains for the Parking Authority has no public counterpart.
7. **Taxi stands are published as a February 2014 spreadsheet** (stale). 112 stands, text locations, no coordinates. Current stands are by-law text (Schedule 05, 159 current rules).
8. **Accessible parking locations are published for lots, not for streets** (missing). The 669 published accessible spaces are all in off-street TPA lots, and the 190 schedule rows of Chapter 950 contain no accessible-parking schedule.

## Methodology

- **Catalogue access.** The CKAN API endpoint in the City's docs, `open.toronto.ca/api/3/action/...`, returns 404. The working endpoint is the CKAN host, `ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/`. All searches and downloads used it on October 20, 2026. Package metadata is preserved in `data/raw/ckan_meta.json`.
- **Inventory rule.** A dataset enters the inventory when its records describe street parking: who may park, stop, or load, where, when, at what price, what blocks a parking space, or how street parking is used or enforced. The remaining keyword matches mention street parking only in passing (a street inside an address, parking inside a survey) and were excluded for that stated reason.
- **Spine.** Toronto Centreline, 64,392 features, filtered to 50,027 road segments. Trails, rivers, railways, walkways, and hydro lines were removed because they have no street parking. Segment geometry is the only geometry the combined dataset asserts as its own.
- **Spatial joins** ran in EPSG:2952 (MTM zone 10). Facility counts use a 250 m radius around each segment's midpoint. Permit areas use the midpoint-in-polygon test. Bike infrastructure requires both proximity (25 m) and street-name equality, so a parallel trail cannot mark a street as having a bike lane.
- **Name joins.** Street names were normalized by one function used for every source: uppercase, drop parenthetical district markers, abbreviate street types in suffix position, fold direction words (West to W). Rule and ticket counts attach at street level because neither source publishes finer locations.
- **Current rules.** Of 77,940 by-law records, 13,914 carry a latest action of "Repealed" and were dropped. 46,455 carry an empty latest-action status and were kept as current. Empty is not proof a rule is in force; it is the absence of a repeal record. The kept set is 27,768 rules in 18 street parking categories (listed in the data dictionary).
- **Tickets.** The slice is the sibling project's raw files (City of Toronto Parking Tickets, 2023-2025; 6,454,695 rows, 6,454,694 with valid dates), not re-downloaded. Two file quirks are handled in code and recorded here because either one silently drops data: the single 2025 file ships UPPERCASE headers and a leading blank line (reading it with lowercase keys yields zero rows for the year), and one monthly file repeats its header row mid-file.
- **Verification.** Per-street ticket counts were cross-checked against the sibling project's geocoded counts (theirs count address-matched tickets only, so the combined counts sit at or above them: Keele St 118,953 against 118,435). The published GeoJSON parses to exactly 50,027 features. The February 2025 storm figures, the TPA budget figures, and the repaint window (the City repaints road markings June 1 to October 31, two coats, per the City's pavement markings page) are context from the cited sources, not outputs of the joins.

## Sources

- City of Toronto Open Data (CKAN), searched and downloaded October 20, 2026: the 34 inventoried datasets, URLs in `data/inventory.csv`.
- Toronto Parking Authority, 2026 Operating Budget report (toronto.ca/legdocs/mmis/2025/pa/bgrd/backgroundfile-260741.pdf): on-street revenue $67.7M over about 21,000 spaces, off-street $97.4M over about 41,000 spaces; February 2025 storm closure of 47% of on-street inventory and 371,000 fewer transactions.
- SenSen, "Digitising the Streets of Toronto: AI-powered Curb Mapping" (sensen.ai/case-studies/digitising-the-streets-of-toronto-with-ai-powered-curb-mapping/) and the August 21, 2023 "Code the Curb" contract announcement.
- City of Toronto, pavement markings page (toronto.ca): markings repainted June 1 to October 31, two coats.

## Run it

```bash
npm install        # or reuse the family scaffold's node_modules
npm run build
npm run start
```

Data pipeline, in order (Python 3, needs `shapely`, `ijson`, `pyproj`):

```bash
python3 scripts/fetch_sources.py    # downloads (by-law JSON is 806 MB, resumable)
python3 scripts/extract_bylaw.py    # streams the by-law file into data/derived/bylaw_rules.csv
python3 scripts/build_joined.py     # the joins: segments, streets, facilities, join log
python3 scripts/build_inventory.py  # inventory.json / inventory.csv
python3 scripts/build_app_data.py   # data/app_data.json + data dictionary
python3 scripts/build_segments.py   # data/segments_by_street.json + public/data/streets.json for the web app
python3 scripts/build_map.py        # public/data/streets_map.geojson, one simplified geometry per street for the homepage map
python3 scripts/build_nearme.py     # public/data/streets_near.json, per-street rule counts + nearest Green P for the Near me list
python3 scripts/build_charts.py     # src/lib/charts-data.json, every number on the /charts page
```

The ticket slice is read from the sibling project at `~/workspace/toronto-parking-tickets-geocoded/data/raw/` (see `TICKET_RAW` in `scripts/build_joined.py`). Raw downloads under `data/raw/` are a cache; the two largest files (the 806 MB by-law JSON and the 93 MB centreline GeoJSON) are not kept in this tree and are restored by `fetch_sources.py`.

## License

Code and derived datasets: MIT. Source datasets remain the City of Toronto's, under the Open Government Licence, Toronto. Ticket data © City of Toronto.
