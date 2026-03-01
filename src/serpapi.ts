import { CliError } from "./errors";
import { ExitCode, FlightOption, FlightQuery } from "./types";

interface SerpApiAirport {
  time?: string;
}

interface SerpApiSegment {
  airline?: string;
  duration?: number;
  departure_airport?: SerpApiAirport;
  arrival_airport?: SerpApiAirport;
}

interface SerpApiItinerary {
  price?: number;
  total_duration?: number;
  flights?: SerpApiSegment[];
}

interface SerpApiResponse {
  error?: string;
  best_flights?: SerpApiItinerary[];
  other_flights?: SerpApiItinerary[];
}

export async function searchFlights(
  query: FlightQuery,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FlightOption[]> {
  const requestUrl = buildRequestUrl(query, apiKey);

  let response: Response;
  try {
    response = await fetchImpl(requestUrl, {
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new CliError("SerpApi request timed out", ExitCode.ApiFailure);
    }

    throw new CliError("Failed to reach SerpApi", ExitCode.ApiFailure);
  }

  if (!response.ok) {
    throw new CliError(`SerpApi request failed with status ${response.status}`, ExitCode.ApiFailure);
  }

  let payload: SerpApiResponse;
  try {
    payload = (await response.json()) as SerpApiResponse;
  } catch {
    throw new CliError("SerpApi returned invalid JSON", ExitCode.ApiFailure);
  }

  if (typeof payload.error === "string" && payload.error.trim() !== "") {
    throw new CliError(`SerpApi error: ${payload.error}`, ExitCode.ApiFailure);
  }

  let flights = shapeSerpApiResponse(payload);

  if (
    typeof query.departureAfterMinutes === "number" &&
    typeof query.departureBeforeMinutes === "number"
  ) {
    flights = filterByDepartureWindow(
      flights,
      query.departureAfterMinutes,
      query.departureBeforeMinutes,
    );
  }

  flights.sort((a, b) => a.price - b.price);
  return flights;
}

export function shapeSerpApiResponse(payload: SerpApiResponse): FlightOption[] {
  const merged = [...(payload.best_flights ?? []), ...(payload.other_flights ?? [])];

  return merged
    .map((itinerary) => shapeItinerary(itinerary))
    .filter((option): option is FlightOption => option !== null);
}

export function filterByDepartureWindow(
  options: FlightOption[],
  minMinutes: number,
  maxMinutes: number,
): FlightOption[] {
  return options.filter((option) => {
    const minutes = extractMinutes(option.departureTime);
    if (minutes === null) {
      return true;
    }

    return minutes >= minMinutes && minutes <= maxMinutes;
  });
}

function shapeItinerary(itinerary: SerpApiItinerary): FlightOption | null {
  if (!Number.isFinite(itinerary.price)) {
    return null;
  }

  const segments = Array.isArray(itinerary.flights) ? itinerary.flights : [];
  if (segments.length === 0) {
    return null;
  }

  const first = segments[0];
  const last = segments[segments.length - 1];

  const departureTime = first.departure_airport?.time;
  const arrivalTime = last.arrival_airport?.time;

  if (!departureTime || !arrivalTime) {
    return null;
  }

  const uniqueAirlines = [...new Set(segments.map((segment) => segment.airline).filter(Boolean))];

  return {
    price: itinerary.price as number,
    airline: uniqueAirlines.length > 0 ? uniqueAirlines.join(", ") : "Unknown",
    departureTime,
    arrivalTime,
    durationMinutes: inferDurationMinutes(itinerary, segments),
    stops: Math.max(0, segments.length - 1),
  };
}

function inferDurationMinutes(itinerary: SerpApiItinerary, segments: SerpApiSegment[]): number {
  if (Number.isFinite(itinerary.total_duration)) {
    return itinerary.total_duration as number;
  }

  const segmentDuration = segments.reduce((total, segment) => {
    if (!Number.isFinite(segment.duration)) {
      return total;
    }
    return total + (segment.duration as number);
  }, 0);

  return segmentDuration;
}

function buildRequestUrl(query: FlightQuery, apiKey: string): string {
  const url = new URL("https://serpapi.com/search.json");

  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("type", "2");
  url.searchParams.set("departure_id", query.origin);
  url.searchParams.set("arrival_id", query.destination);
  url.searchParams.set("outbound_date", query.departureDate);
  url.searchParams.set("sort_by", "2");
  url.searchParams.set("currency", "USD");
  url.searchParams.set("api_key", apiKey);

  if (query.airlineCode) {
    url.searchParams.set("include_airlines", query.airlineCode);
  }

  if (typeof query.maxStops === "number") {
    url.searchParams.set("stops", toSerpApiStopsFilter(query.maxStops));
  }

  if (typeof query.maxPrice === "number") {
    url.searchParams.set("max_price", String(query.maxPrice));
  }

  if (
    typeof query.departureAfterMinutes === "number" &&
    typeof query.departureBeforeMinutes === "number"
  ) {
    const minHour = Math.floor(query.departureAfterMinutes / 60);
    const maxHour = Math.max(
      minHour,
      Math.floor(Math.max(0, query.departureBeforeMinutes - 1) / 60),
    );

    url.searchParams.set("outbound_times", `${minHour},${maxHour}`);
  }

  return url.toString();
}

function toSerpApiStopsFilter(maxStops: number): string {
  if (maxStops === 0) {
    return "1";
  }

  if (maxStops === 1) {
    return "2";
  }

  return "3";
}

function extractMinutes(value: string): number | null {
  const match = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(value);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}
