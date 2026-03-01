import { CliError } from "./errors";
import { ExitCode, FlightBookingQuery, FlightQuery, HotelQuery, ParsedArgs } from "./types";

interface FlightRawOptions {
  from?: string;
  to?: string;
  date?: string;
  airline?: string;
  maxStops?: string;
  maxPrice?: string;
  departAfter?: string;
  departBefore?: string;
  excludeBasic: boolean;
  outputJson: boolean;
  help: boolean;
}

interface HotelRawOptions {
  where?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  maxPrice?: string;
  rating?: string;
  outputJson: boolean;
  help: boolean;
}

interface FlightBookingRawOptions {
  from?: string;
  to?: string;
  date?: string;
  tokens: string[];
  outputJson: boolean;
  help: boolean;
}

type SearchMode = "flights" | "hotels" | "flight-booking";

const HELP_FLAGS = new Set(["-h", "--help"]);

export function parseCliArgs(argv: string[]): ParsedArgs {
  if (argv.some((token) => HELP_FLAGS.has(token))) {
    return {
      help: true,
      outputJson: argv.includes("--json"),
    };
  }

  const { mode, args } = stripSubcommands(argv);

  if (mode === "hotels") {
    return parseHotelsArgs(args);
  }

  if (mode === "flight-booking") {
    return parseFlightBookingArgs(args);
  }

  return parseFlightsArgs(args);
}

function parseFlightsArgs(args: string[]): ParsedArgs {
  const raw: FlightRawOptions = {
    excludeBasic: false,
    outputJson: false,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (HELP_FLAGS.has(token)) {
      raw.help = true;
      continue;
    }

    if (token === "--json") {
      raw.outputJson = true;
      continue;
    }

    if (token === "--exclude-basic") {
      raw.excludeBasic = true;
      continue;
    }

    if (!token.startsWith("--")) {
      throw new CliError(`Unexpected argument: ${token}`, ExitCode.InvalidInput);
    }

    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CliError(`Missing value for ${token}`, ExitCode.InvalidInput);
    }

    switch (token) {
      case "--from":
        raw.from = value;
        break;
      case "--to":
        raw.to = value;
        break;
      case "--date":
        raw.date = value;
        break;
      case "--airline":
        raw.airline = value;
        break;
      case "--max-stops":
        raw.maxStops = value;
        break;
      case "--max-price":
        raw.maxPrice = value;
        break;
      case "--depart-after":
        raw.departAfter = value;
        break;
      case "--depart-before":
        raw.departBefore = value;
        break;
      default:
        throw new CliError(`Unknown flag: ${token}`, ExitCode.InvalidInput);
    }

    i += 1;
  }

  if (raw.help) {
    return {
      help: true,
      outputJson: raw.outputJson,
    };
  }

  return {
    help: false,
    mode: "flights",
    outputJson: raw.outputJson,
    query: buildFlightQuery(raw),
  };
}

function parseHotelsArgs(args: string[]): ParsedArgs {
  const raw: HotelRawOptions = {
    outputJson: false,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (HELP_FLAGS.has(token)) {
      raw.help = true;
      continue;
    }

    if (token === "--json") {
      raw.outputJson = true;
      continue;
    }

    if (!token.startsWith("--")) {
      throw new CliError(`Unexpected argument: ${token}`, ExitCode.InvalidInput);
    }

    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CliError(`Missing value for ${token}`, ExitCode.InvalidInput);
    }

    switch (token) {
      case "--where":
        raw.where = value;
        break;
      case "--check-in":
        raw.checkIn = value;
        break;
      case "--check-out":
        raw.checkOut = value;
        break;
      case "--adults":
        raw.adults = value;
        break;
      case "--max-price":
        raw.maxPrice = value;
        break;
      case "--rating":
        raw.rating = value;
        break;
      default:
        throw new CliError(`Unknown flag: ${token}`, ExitCode.InvalidInput);
    }

    i += 1;
  }

  if (raw.help) {
    return {
      help: true,
      outputJson: raw.outputJson,
    };
  }

  return {
    help: false,
    mode: "hotels",
    outputJson: raw.outputJson,
    query: buildHotelQuery(raw),
  };
}

function parseFlightBookingArgs(args: string[]): ParsedArgs {
  const raw: FlightBookingRawOptions = {
    tokens: [],
    outputJson: false,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];

    if (HELP_FLAGS.has(token)) {
      raw.help = true;
      continue;
    }

    if (token === "--json") {
      raw.outputJson = true;
      continue;
    }

    if (token === "--token") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new CliError("Missing value for --token", ExitCode.InvalidInput);
      }
      raw.tokens.push(value.trim());
      i += 1;
      continue;
    }

    const value = args[i + 1];
    if (!value || value.startsWith("--")) {
      throw new CliError(`Missing value for ${token}`, ExitCode.InvalidInput);
    }

    switch (token) {
      case "--from":
        raw.from = value;
        break;
      case "--to":
        raw.to = value;
        break;
      case "--date":
        raw.date = value;
        break;
      default:
        throw new CliError(`Unknown flag: ${token}`, ExitCode.InvalidInput);
    }

    i += 1;
  }

  if (raw.help) {
    return {
      help: true,
      outputJson: raw.outputJson,
    };
  }

  return {
    help: false,
    mode: "flight-booking",
    outputJson: raw.outputJson,
    query: buildFlightBookingQuery(raw),
  };
}

function buildFlightQuery(raw: FlightRawOptions): FlightQuery {
  if (!raw.from || !raw.to || !raw.date) {
    throw new CliError("Missing required flags: --from, --to, --date", ExitCode.InvalidInput);
  }

  const origin = normalizeAirport(raw.from, "origin");
  const destination = normalizeAirport(raw.to, "destination");

  if (origin === destination) {
    throw new CliError("Origin and destination must be different airports", ExitCode.InvalidInput);
  }

  const departureDate = normalizeDate(raw.date, "departure");
  const airlineCode = raw.airline ? normalizeAirlineCode(raw.airline) : undefined;
  const maxStops = raw.maxStops ? normalizeMaxStops(raw.maxStops) : undefined;
  const maxPrice = raw.maxPrice ? normalizeMaxPrice(raw.maxPrice) : undefined;

  const hasDepartAfter = typeof raw.departAfter === "string";
  const hasDepartBefore = typeof raw.departBefore === "string";

  if (hasDepartAfter !== hasDepartBefore) {
    throw new CliError(
      "Departure window requires both --depart-after and --depart-before",
      ExitCode.InvalidInput,
    );
  }

  let departureAfterMinutes: number | undefined;
  let departureBeforeMinutes: number | undefined;

  if (hasDepartAfter && hasDepartBefore) {
    departureAfterMinutes = normalizeTime(raw.departAfter as string, "--depart-after");
    departureBeforeMinutes = normalizeTime(raw.departBefore as string, "--depart-before");

    if (departureAfterMinutes >= departureBeforeMinutes) {
      throw new CliError(
        "Departure window must be on the same day and --depart-after must be earlier than --depart-before",
        ExitCode.InvalidInput,
      );
    }
  }

  return {
    origin,
    destination,
    departureDate,
    airlineCode,
    maxStops,
    maxPrice,
    departureAfterMinutes,
    departureBeforeMinutes,
    excludeBasic: raw.excludeBasic || undefined,
  };
}

function buildHotelQuery(raw: HotelRawOptions): HotelQuery {
  if (!raw.where || !raw.checkIn || !raw.checkOut) {
    throw new CliError(
      "Missing required flags: --where, --check-in, --check-out",
      ExitCode.InvalidInput,
    );
  }

  const location = normalizeLocation(raw.where);
  const checkInDate = normalizeDate(raw.checkIn, "check-in");
  const checkOutDate = normalizeDate(raw.checkOut, "check-out");
  const adults = raw.adults ? normalizeAdults(raw.adults) : 2;
  const maxPrice = raw.maxPrice ? normalizeMaxPrice(raw.maxPrice) : undefined;
  const minRating = raw.rating ? normalizeMinRating(raw.rating) : undefined;

  const checkIn = parseDateOnly(checkInDate);
  const checkOut = parseDateOnly(checkOutDate);

  if (checkOut <= checkIn) {
    throw new CliError("Check-out date must be after check-in date", ExitCode.InvalidInput);
  }

  return {
    location,
    checkInDate,
    checkOutDate,
    adults,
    maxPrice,
    minRating,
  };
}

function buildFlightBookingQuery(raw: FlightBookingRawOptions): FlightBookingQuery {
  if (!raw.from || !raw.to || !raw.date) {
    throw new CliError("Missing required flags: --from, --to, --date", ExitCode.InvalidInput);
  }

  const origin = normalizeAirport(raw.from, "origin");
  const destination = normalizeAirport(raw.to, "destination");
  if (origin === destination) {
    throw new CliError("Origin and destination must be different airports", ExitCode.InvalidInput);
  }

  const departureDate = normalizeDate(raw.date, "departure");
  const tokens = raw.tokens.filter((token) => token.length > 0);
  if (tokens.length === 0) {
    throw new CliError("Missing required flag: --token", ExitCode.InvalidInput);
  }

  return {
    origin,
    destination,
    departureDate,
    tokens,
  };
}

function stripSubcommands(argv: string[]): { mode: SearchMode; args: string[] } {
  const args = [...argv];
  if (args[0] === "hotels") {
    args.shift();
    return { mode: "hotels", args };
  }

  if (args[0] === "flights") {
    args.shift();
    if (args[0] === "booking") {
      args.shift();
      return { mode: "flight-booking", args };
    }

    if (args[0] === "one-way") {
      args.shift();
    }

    return { mode: "flights", args };
  }

  throw new CliError(
    "Missing subcommand: use `flights` or `hotels`",
    ExitCode.InvalidInput,
  );
}

function normalizeAirport(value: string, fieldName: "origin" | "destination"): string {
  const upper = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(upper)) {
    throw new CliError(
      `Invalid ${fieldName} airport code: ${value}. Expected a 3 letter IATA code.`,
      ExitCode.InvalidInput,
    );
  }
  return upper;
}

function normalizeAirlineCode(value: string): string {
  const upper = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{2}$/.test(upper)) {
    throw new CliError(
      `Invalid airline code: ${value}. Expected a 2 character IATA airline code.`,
      ExitCode.InvalidInput,
    );
  }
  return upper;
}

function normalizeLocation(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new CliError("Location cannot be empty", ExitCode.InvalidInput);
  }

  return trimmed;
}

function normalizeDate(value: string, fieldName: "departure" | "check-in" | "check-out"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new CliError("Invalid date. Expected YYYY-MM-DD", ExitCode.InvalidInput);
  }

  const date = parseDateOnly(value);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    if (fieldName === "departure") {
      throw new CliError("Invalid departure date", ExitCode.InvalidInput);
    }

    throw new CliError(`Invalid ${fieldName} date`, ExitCode.InvalidInput);
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date < today) {
    if (fieldName === "departure") {
      throw new CliError("Departure date cannot be in the past", ExitCode.InvalidInput);
    }

    throw new CliError(`${capitalize(fieldName)} date cannot be in the past`, ExitCode.InvalidInput);
  }

  return value;
}

function normalizeMaxStops(value: string): number {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 2) {
    throw new CliError("--max-stops must be an integer between 0 and 2", ExitCode.InvalidInput);
  }
  return numeric;
}

function normalizeMaxPrice(value: string): number {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new CliError("--max-price must be a positive integer", ExitCode.InvalidInput);
  }
  return numeric;
}

function normalizeAdults(value: string): number {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new CliError("--adults must be a positive integer", ExitCode.InvalidInput);
  }

  return numeric;
}

function normalizeMinRating(value: string): 3.5 | 4 | 4.5 | 5 {
  const numeric = Number.parseFloat(value);
  if (numeric !== 3.5 && numeric !== 4 && numeric !== 4.5 && numeric !== 5) {
    throw new CliError("--rating must be one of: 3.5, 4, 4.5, 5", ExitCode.InvalidInput);
  }

  return numeric;
}

function normalizeTime(value: string, flagName: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new CliError(`${flagName} must be in HH:MM 24 hour format`, ExitCode.InvalidInput);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
