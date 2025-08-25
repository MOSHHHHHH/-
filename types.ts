
// API response for GTFS routes (Type 1)
export interface GtfsRoute {
  id: number;
  route_short_name: string;
  route_long_name: string;
  route_mkt: string;
  route_direction: string;
  route_alternative: string;
  agency_name: string;
}

// API response for GTFS ride stops (Type 2)
export interface GtfsRideStop {
  id: number;
  arrival_time: string; // ISO date string
  departure_time: string; // ISO date string
  gtfs_stop__code: number;
  gtfs_stop__name: string;
  gtfs_stop__city: string;
  gtfs_route__route_short_name: string;
  gtfs_route__route_long_name: string;
  gtfs_route__route_mkt: string;
  gtfs_route__route_direction: string;
  gtfs_route__route_alternative: string;
}

// Internal data structure for a selected stop
export interface SelectedStop {
  code: number;
  name: string;
  city: string;
}

// Internal data structure for a selected line/route
export interface SelectedLine {
  id: string; // unique ID for React keys, e.g., `${route_mkt}-${route_direction}-${route_alternative}`
  short_name: string;
  long_name: string;
  mkt: string;
  direction: string;
  alternative: string;
  agency: string;
  selected_stop: SelectedStop | null;
}

// Internal data structure for a group of lines
export interface LineGroup {
  id: string; // unique ID for the group
  name: string;
  lines: SelectedLine[];
}

// Internal data structure for the generated timetable
export interface TimetableData {
    day: string; // YYYY-MM-DD
    nickname: string;
    rides: GtfsRideStop[];
}
