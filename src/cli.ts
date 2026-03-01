import { resolveApiKey } from "./config";
import { CliError } from "./errors";
import { renderFlightTable, renderHotelTable } from "./format";
import { parseCliArgs } from "./parse";
import { searchFlights, searchHotels } from "./serpapi";
import { ExitCode } from "./types";

interface Output {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

interface RunOptions {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  fetchImpl?: typeof fetch;
  output?: Output;
}

const HELP_TEXT = `wayfinder v0.2.0 travel search

Usage:
  wayfinder flights --from SFO --to JFK --date 2026-03-21 [filters]
  wayfinder flights one-way --from SFO --to JFK --date 2026-03-21 [filters]
  wayfinder hotels --where "New York, NY" --check-in 2026-03-21 --check-out 2026-03-23 [filters]

Flights required:
  --from <IATA>             Origin airport code
  --to <IATA>               Destination airport code
  --date <YYYY-MM-DD>       Departure date

Flights optional filters:
  --airline <IATA>          Airline code, example UA
  --max-stops <0|1|2>       Maximum number of stops
  --max-price <USD>         Max price in USD
  --depart-after <HH:MM>    Start of departure window
  --depart-before <HH:MM>   End of departure window
  --exclude-basic           Exclude basic economy fares

Hotels required:
  --where <QUERY>           Destination or hotel search query
  --check-in <YYYY-MM-DD>   Check-in date
  --check-out <YYYY-MM-DD>  Check-out date

Hotels optional filters:
  --adults <N>              Number of adults (default 2)
  --max-price <USD>         Max nightly rate in USD
  --rating <3.5|4|4.5|5>    Minimum guest rating

Output:
  --json                    Print structured JSON output`;

export async function runWayfinder(
  argv: string[] = process.argv.slice(2),
  options: RunOptions = {},
): Promise<number> {
  const output = options.output ?? {
    stdout: (message: string) => console.log(message),
    stderr: (message: string) => console.error(message),
  };

  try {
    const parsed = parseCliArgs(argv);

    if (parsed.help) {
      output.stdout(HELP_TEXT);
      return ExitCode.Success;
    }

    const apiKey = resolveApiKey(options.env ?? process.env, options.homeDir);
    if (parsed.mode === "flights") {
      const flights = await searchFlights(parsed.query, apiKey, options.fetchImpl ?? fetch);

      if (flights.length === 0) {
        throw new CliError("No flights found for the selected query", ExitCode.NoResults);
      }

      if (parsed.outputJson) {
        output.stdout(
          JSON.stringify(
            {
              query: parsed.query,
              results: flights,
            },
            null,
            2,
          ),
        );
      } else {
        output.stdout(renderFlightTable(flights));
      }
    } else {
      const hotels = await searchHotels(parsed.query, apiKey, options.fetchImpl ?? fetch);

      if (hotels.length === 0) {
        throw new CliError("No hotels found for the selected query", ExitCode.NoResults);
      }

      if (parsed.outputJson) {
        output.stdout(
          JSON.stringify(
            {
              query: parsed.query,
              results: hotels,
            },
            null,
            2,
          ),
        );
      } else {
        output.stdout(renderHotelTable(hotels));
      }
    }

    return ExitCode.Success;
  } catch (error) {
    if (error instanceof CliError) {
      output.stderr(error.message);
      return error.exitCode;
    }

    output.stderr("Unexpected internal error");
    return ExitCode.InternalError;
  }
}

if (import.meta.main) {
  const code = await runWayfinder(process.argv.slice(2));
  process.exitCode = code;
}
