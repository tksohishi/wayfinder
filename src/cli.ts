import { resolveApiKey } from "./config";
import { CliError } from "./errors";
import { renderTable } from "./format";
import { parseCliArgs } from "./parse";
import { searchFlights } from "./serpapi";
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

const HELP_TEXT = `wayfinder v1 flight search

Usage:
  wayfinder --from SFO --to JFK --date 2026-03-21 [filters]
  wayfinder flights one-way --from SFO --to JFK --date 2026-03-21 [filters]

Required:
  --from <IATA>             Origin airport code
  --to <IATA>               Destination airport code
  --date <YYYY-MM-DD>       Departure date

Optional filters:
  --airline <IATA>          Airline code, example UA
  --max-stops <0|1|2>       Maximum number of stops
  --max-price <USD>         Max price in USD
  --depart-after <HH:MM>    Start of departure window
  --depart-before <HH:MM>   End of departure window

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
    const flights = await searchFlights(parsed.query!, apiKey, options.fetchImpl ?? fetch);

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
      output.stdout(renderTable(flights));
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
