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

export function fmt(n: number): string {
  return n.toLocaleString("en-CA");
}
