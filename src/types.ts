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

export interface HotelQuery {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  maxPrice?: number;
  minRating?: 3.5 | 4 | 4.5 | 5;
}

export interface ParsedArgsHelp {
  help: true;
  outputJson: boolean;
}

export interface ParsedArgsFlights {
  help: false;
  mode: "flights";
  outputJson: boolean;
  query: FlightQuery;
}

export interface ParsedArgsHotels {
  help: false;
  mode: "hotels";
  outputJson: boolean;
  query: HotelQuery;
}

export type ParsedArgs = ParsedArgsHelp | ParsedArgsFlights | ParsedArgsHotels;

export interface FlightOption {
  price: number;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
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
