export const ExitCode = {
  Success: 0,
  InternalError: 1,
  InvalidInput: 2,
  MissingApiKey: 3,
  ApiFailure: 4,
  NoResults: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export interface FlightQuery {
  origin: string;
  destination: string;
  departureDate: string;
  airlineCode?: string;
  maxStops?: number;
  maxPrice?: number;
  departureAfterMinutes?: number;
  departureBeforeMinutes?: number;
  excludeBasic?: boolean;
}

export interface FlightMultiDateQuery {
  origin: string;
  destination: string;
  departureDates: string[];
  airlineCode?: string;
  maxStops?: number;
  maxPrice?: number;
  departureAfterMinutes?: number;
  departureBeforeMinutes?: number;
  excludeBasic?: boolean;
}

export type FlightsQuery = FlightQuery | FlightMultiDateQuery;

export interface HotelQuery {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  maxPrice?: number;
  minRating?: 3.5 | 4 | 4.5 | 5;
}

export type PlaceType = "restaurant" | "coffee";
export type PlaceRange = "walk";

export interface PlaceQuery {
  near: string;
  type: PlaceType;
  limit: number;
  range?: PlaceRange;
}

export interface ParsedArgsHelp {
  help: true;
  outputJson: boolean;
}

export interface ParsedArgsFlights {
  help: false;
  mode: "flights";
  outputJson: boolean;
  query: FlightsQuery;
}

export interface ParsedArgsHotels {
  help: false;
  mode: "hotels";
  outputJson: boolean;
  query: HotelQuery;
}

export interface FlightBookingQuery {
  origin: string;
  destination: string;
  departureDate: string;
  tokens: string[];
}

export interface ParsedArgsFlightBooking {
  help: false;
  mode: "flight-booking";
  outputJson: boolean;
  query: FlightBookingQuery;
}

export interface ParsedArgsSetup {
  help: false;
  mode: "setup";
  outputJson: boolean;
  reset: boolean;
}

export interface ParsedArgsPlaces {
  help: false;
  mode: "places";
  outputJson: boolean;
  query: PlaceQuery;
}

export type ParsedArgs =
  | ParsedArgsHelp
  | ParsedArgsFlights
  | ParsedArgsHotels
  | ParsedArgsPlaces
  | ParsedArgsFlightBooking
  | ParsedArgsSetup;

export interface FlightOption {
  price: number;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
  bookingToken?: string;
}

export interface HotelOption {
  name: string;
  nightlyPrice: number;
  totalPrice?: number;
  rating?: number;
  reviews?: number;
  location: string;
  link?: string;
}

export interface PlaceOption {
  name: string;
  category: PlaceType;
  rating?: number;
  reviews?: number;
  address?: string;
  distanceMeters?: number;
  openState?: string;
  link?: string;
  googleMapsUrl?: string;
  score: number;
}

export interface FlightSearchResult {
  options: FlightOption[];
  googleFlightsUrl?: string;
}

export interface FlightDateResult {
  date: string;
  results: FlightOption[];
  googleFlightsUrl?: string;
}

export interface FlightMultiDateSearchResult {
  resultsByDate: FlightDateResult[];
}

export interface FlightBookingLink {
  url: string;
  source?: string;
  price?: number;
}

export interface FlightBookingResult {
  token: string;
  googleFlightsUrl?: string;
  links: FlightBookingLink[];
}
