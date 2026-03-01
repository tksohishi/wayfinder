import { CliError } from "./errors";
import { ExitCode, ParsedArgs } from "./types";

interface RawOptions {
  from?: string;
  to?: string;
  date?: string;
  airline?: string;
  maxStops?: string;
  maxPrice?: string;
  departAfter?: string;
  departBefore?: string;
  outputJson: boolean;
  help: boolean;
}

const HELP_FLAGS = new Set(["-h", "--help"]);

export function parseCliArgs(argv: string[]): ParsedArgs {
  const args = stripSubcommands(argv);
  const raw: RawOptions = {
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

  if (!raw.from || !raw.to || !raw.date) {
    throw new CliError("Missing required flags: --from, --to, --date", ExitCode.InvalidInput);
  }

  const origin = normalizeAirport(raw.from, "origin");
  const destination = normalizeAirport(raw.to, "destination");

  if (origin === destination) {
    throw new CliError("Origin and destination must be different airports", ExitCode.InvalidInput);
  }

  const departureDate = normalizeDate(raw.date);
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
    help: false,
    outputJson: raw.outputJson,
    query: {
      origin,
      destination,
      departureDate,
      airlineCode,
      maxStops,
      maxPrice,
      departureAfterMinutes,
      departureBeforeMinutes,
    },
  };
}

function stripSubcommands(argv: string[]): string[] {
  const args = [...argv];

  if (args[0] === "flights") {
    args.shift();
    if (args[0] === "one-way") {
      args.shift();
    }
  }

  return args;
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

function normalizeDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new CliError("Invalid date. Expected YYYY-MM-DD", ExitCode.InvalidInput);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new CliError("Invalid departure date", ExitCode.InvalidInput);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date < today) {
    throw new CliError("Departure date cannot be in the past", ExitCode.InvalidInput);
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

function normalizeTime(value: string, flagName: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new CliError(`${flagName} must be in HH:MM 24 hour format`, ExitCode.InvalidInput);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}
