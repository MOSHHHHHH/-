
import { GtfsRoute, GtfsRideStop, SelectedLine } from '../types';

const API_BASE_URL = 'https://open-bus-stride-api.hasadna.org.il';

const getNextWeekDates = (): { from: string, to: string } => {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(fromDate.getDate() + 7);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    return { from: formatDate(fromDate), to: formatDate(toDate) };
};

export const fetchRoutesForLine = async (lineNumber: string): Promise<GtfsRoute[]> => {
    const { from, to } = getNextWeekDates();
    const params = new URLSearchParams({
        limit: '300',
        get_count: 'false',
        date_from: from,
        date_to: to,
        route_short_name: lineNumber,
        order_by: 'id asc',
    });
    const response = await fetch(`${API_BASE_URL}/gtfs_routes/list?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch routes');
    }
    return response.json();
};

export const fetchStopsForRoute = async (line: SelectedLine): Promise<GtfsRideStop[]> => {
    const fromDate = new Date();
    const toDate = new Date();
    toDate.setDate(fromDate.getDate() + 7);

    const params = new URLSearchParams({
        limit: '300',
        get_count: 'false',
        arrival_time_from: fromDate.toISOString(),
        arrival_time_to: toDate.toISOString(),
        gtfs_route__route_mkt: line.mkt,
        gtfs_route__route_direction: line.direction,
        gtfs_route__route_alternative: line.alternative,
        order_by: 'stop_sequence asc',
    });
    const response = await fetch(`${API_BASE_URL}/gtfs_ride_stops/list?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch stops');
    }
    return response.json();
};

export const fetchTimetable = async (line: SelectedLine, stopCode: number, date: string): Promise<GtfsRideStop[]> => {
    const fromDateTime = `${date}T03:00:00+02:00`;
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const toDateTime = `${nextDay.toISOString().split('T')[0]}T02:59:59+02:00`;

    const params = new URLSearchParams({
        limit: '300',
        get_count: 'false',
        arrival_time_from: fromDateTime,
        arrival_time_to: toDateTime,
        gtfs_stop__code: stopCode.toString(),
        gtfs_route__route_mkt: line.mkt,
        gtfs_route__route_direction: line.direction,
        gtfs_route__route_alternative: line.alternative,
        order_by: 'arrival_time asc',
    });
    const response = await fetch(`${API_BASE_URL}/gtfs_ride_stops/list?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch timetable for line ${line.short_name} on ${date}`);
    }
    return response.json();
};
