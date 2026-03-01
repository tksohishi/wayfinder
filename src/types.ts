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
}

export interface ParsedArgs {
  query?: FlightQuery;
  outputJson: boolean;
  help: boolean;
}

export interface FlightOption {
  price: number;
  airline: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  stops: number;
}
