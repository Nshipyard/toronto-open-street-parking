import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

export interface InventoryRow {
  ckan_id: string;
  title: string;
  publisher: string;
  owner_division: string;
  last_updated: string;
  last_refreshed: string;
  refresh_rate: string;
  formats: string[];
  num_resources: number;
  geometry: string;
  curb_attributes: string[];
  joined: string;
  join_role: string;
  notes: string;
  catalogue_url: string;
}

export interface JoinRow {
  join: string;
  method: string;
  left_rows?: number;
  right_rows?: number;
  matched_left_rows?: number;
  matched_right_rows?: number;
  match_rate_left?: number;
  match_rate_right?: number;
  distinct_left_streets?: number;
  matched_left_streets?: number;
  tickets_on_matched_streets?: number;
  ticket_coverage?: number;
  notes?: string;
}

export interface GapRow {
  id: string;
  title: string;
  claim: string;
  evidence: string;
  kind: "missing" | "text-only" | "stale" | "partial";
}

export interface StreetRow {
  street: string;
  street_norm: string;
  segments: number;
  length_km: number;
  bike_infra_share: number;
  permit_share: number;
  rules_total: number;
  tickets_2023_2025: number;
  green_p_250m_max: number;
  bike_share_250m_max: number;
  cafeto_250m_max: number;
}

export interface Summary {
  built: string;
  datasets_inventoried: number;
  datasets_joined: number;
  segments: number;
  streets: number;
  total_length_km: number;
  segments_with_bike_infra: number;
  segments_in_permit_area: number;
  bylaw_rules_current: number;
  bylaw_records_total: number;
  rules_with_anchor: number;
  ticket_rows: number;
  tickets_on_matched_streets: number;
  green_p_facilities: number;
  green_p_with_occupancy: number;
  bike_share_stations: number;
  cafeto_curb_lane: number;
  accessible_stalls_offstreet: number;
  ev_chargers: number;
  gaps_documented: number;
}

export interface AppData {
  summary: Summary;
  inventory: InventoryRow[];
  joins: JoinRow[];
  gaps: GapRow[];
  streets: StreetRow[];
  topStreets: StreetRow[];
  greenP: {
    carpark_id: string;
    address: string;
    type: string;
    capacity: string;
    rate_text: string;
    occupancy_period: string;
    occupancy_peak_pct: string;
  }[];
}

let cache: AppData | null = null;

export function getData(): AppData {
  if (!cache) {
    cache = JSON.parse(fs.readFileSync(path.join(DATA, "app_data.json"), "utf-8")) as AppData;
  }
  return cache;
}

// Per-street segment data, built by scripts/build_segments.py from
// data/open_curb_segments.csv. Rule counts and ticket counts in the source are
// street-level, so rules are stored once per street as rule_categories.
export type SegmentTuple = [
  number, // segment_id
  string, // road_class
  number, // oneway 1/0
  number, // length_m
  number | null, // addr_lo_l
  number | null, // addr_hi_l
  number | null, // addr_lo_r
  number | null, // addr_hi_r
  string, // bike_infra_type ("" when none)
  string, // permit_area ("" when none)
  number, // green_p_250m
  number, // bike_share_250m
  number, // cafeto_curb_lane_250m
  number, // accessible_stalls_250m
  number, // ev_chargers_250m
  number | null, // nearest_green_p_m
];

export interface StreetSegments {
  street: string;
  rule_categories: Record<string, number>;
  segments: SegmentTuple[];
}

let segCache: Record<string, StreetSegments> | null = null;

export function getSegmentsByStreet(): Record<string, StreetSegments> {
  if (!segCache) {
    segCache = JSON.parse(
      fs.readFileSync(path.join(DATA, "segments_by_street.json"), "utf-8")
    ) as Record<string, StreetSegments>;
  }
  return segCache;
}

export function expandSegment(t: SegmentTuple) {
  return {
    segment_id: t[0],
    road_class: t[1],
    oneway: t[2] === 1,
    length_m: t[3],
    addr_lo_l: t[4],
    addr_hi_l: t[5],
    addr_lo_r: t[6],
    addr_hi_r: t[7],
    bike_infra_type: t[8] || null,
    permit_area: t[9] || null,
    green_p_250m: t[10],
    bike_share_250m: t[11],
    cafeto_curb_lane_250m: t[12],
    accessible_stalls_250m: t[13],
    ev_chargers_250m: t[14],
    nearest_green_p_m: t[15],
  };
}

export function fmt(n: number): string {
  return n.toLocaleString("en-CA");
}
