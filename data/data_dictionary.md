# Data dictionary: toronto-open-street-parking combined segment dataset

One row per Toronto Centreline road segment (50,027 rows). Fields, what they mean, which dataset each field came from, and the join that attached it. Fields marked street-level attach the same value to every segment of a street, because the source publishes no finer location.

| Field | Definition | Source dataset | Join path |
|---|---|---|---|
| segment_id | Centreline segment identifier (CENTRELINE_ID). One row is one block-length piece of a street between two intersections. | Toronto Centreline (TCL) | spine |
| street_name | Street name as printed in the Centreline file, e.g. 'Queen St W'. | Toronto Centreline (TCL) | spine |
| street_norm | Normalized street name used as the join key for every name-based join: uppercased, street types abbreviated, district markers removed. | derived in this project | normalization of street_name |
| road_class | Centreline feature class: Local, Collector, Major Arterial, Minor Arterial, Laneway, Expressway, and related road classes. Trails, rivers, railways and walkways were removed before the combination. | Toronto Centreline (TCL) | spine filter |
| oneway | True when the Centreline one-way direction code is anything other than 'Not One-Way'. | Toronto Centreline (TCL) | spine |
| length_m | Segment length in metres, computed from the segment geometry in EPSG:2952. | derived in this project | geometry measure |
| addr_lo_l / addr_hi_l / addr_lo_r / addr_hi_r | Lowest and highest street numbers on the left and right sides of the segment, where the Centreline carries them. The address range is the finest published hint of where along a street something sits. | Toronto Centreline (TCL) | spine |
| bike_infra_type | Cycling infrastructure type on this segment (Bike Lane, Cycle Track, Sharrows, and so on), blank when none. Off-road trails were excluded: they do not occupy a parking lane. | Cycling Network | spatial: cycling line within 25 m AND same normalized street name |
| permit_area | On-street permit parking area code (e.g. 12B) when the segment's midpoint falls inside a permit-area polygon, blank otherwise. | On-Street Permit Parking Area Maps | spatial: midpoint in polygon |
| rules_<category> | Count of current Chapter 950 street parking rules in a category that name this segment's street. Categories: no_parking, no_stopping, no_standing, time_limited_parking, commercial_loading, passenger_loading, delivery_vehicle_parking, bus_loading, school_bus_loading, bus_parking, taxicab_stand, winter_parking_prohibited, snow_storm_parking, carshare_parking, ev_charging_parking, municipal_parking_facility, permitted_angle_parking, reserved_lane. Counts are street-level: the by-law has no segment geometry, so every segment of a street carries the street's counts. | Traffic and Parking By-Law Schedules | street-name equality on street_norm |
| rules_total | Sum of rules_<category> across the 18 categories. | derived in this project | sum |
| tickets_2023_2025 | Parking tickets written on this segment's street in 2023-2025. Street-level: tickets publish a street address, not a segment. | Parking Tickets (2023-2025 slice from the toronto-parking-tickets-geocoded project) | street-name equality on street_norm, address stripped of its house number |
| green_p_250m | Green P car parks within 250 m of the segment's midpoint. | Green P Parking (2019 snapshot) | spatial: point within 250 m of midpoint |
| bike_share_250m | Bike Share Toronto stations within 250 m of the segment's midpoint. | Bike Share Toronto (live GBFS station feed) | spatial: point within 250 m of midpoint |
| cafeto_curb_lane_250m | CaféTO locations (parking-lane cafés and parklets) within 250 m of the segment's midpoint. | CaféTO Locations | spatial: point within 250 m of midpoint |
| accessible_stalls_250m | TPA accessible stalls in off-street surface lots within 250 m of the segment's midpoint. | Off-Street Parking, Surface Lots, Accessible Stalls | spatial: point within 250 m of midpoint |
| ev_chargers_250m | City-operated EV charging locations within 250 m of the segment's midpoint. | City Operated Electric Vehicle Charging Station Map | spatial: point within 250 m of midpoint |
| nearest_green_p_m | Distance in metres from the segment's midpoint to the nearest Green P car park. | Green P Parking (2019 snapshot) | spatial: nearest point |
| geometry (GeoJSON only) | Segment line in WGS84, coordinates rounded to 5 decimal places. | Toronto Centreline (TCL) | spine |

## Companion files

- `green_p_facilities.csv`: 252 Green P car parks with address, type, capacity, published rate text, and the latest quarter of TPA parking occupancy, joined by car park number (Green P id 52 to occupancy CP52).
- `bylaw_rules.csv`: the 27,768 current Chapter 950 street parking rules, one row per rule, with street, side, extent text, times text, category, and an intersection anchor point where the source carries one.
- `inventory.csv` / `inventory.json`: the 34 inventoried street parking datasets with catalogue metadata, street parking attributes, and join status.
- `open_curb_streets.csv`: the segment table rolled up to one row per street.
