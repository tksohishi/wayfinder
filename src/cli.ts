import { getConfigPath, readConfigApiKey, resolveApiKey, writeConfigApiKey } from "./config";
import { CliError } from "./errors";
import { renderFlightTable, renderHotelTable, renderPlaceTable } from "./format";
import { parseCliArgs } from "./parse";
import { searchFlightBookingOptions, searchFlights, searchHotels, searchPlaces } from "./serpapi";
import { ExitCode } from "./types";
import { createInterface } from "node:readline/promises";
import { stdin as defaultStdin, stdout as defaultStdout } from "node:process";
import { existsSync, unlinkSync } from "node:fs";

interface Output {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

interface RunOptions {
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  fetchImpl?: typeof fetch;
  output?: Output;
  isInteractive?: boolean;
  promptImpl?: (prompt: string) => Promise<string>;
}

const HELP_TEXT = `wayfinder v0.3.0 travel search

Usage:
  wayfinder setup [--reset]
  wayfinder flights --from SFO --to JFK --date 2026-03-21 [filters]
  wayfinder flights one-way --from SFO --to JFK --date 2026-03-21 [filters]
  wayfinder flights booking --from SFO --to JFK --date 2026-03-21 --token <BOOKING_TOKEN> [--token <BOOKING_TOKEN>] [--json]
  wayfinder hotels --where "New York, NY" --check-in 2026-03-21 --check-out 2026-03-23 [filters]
  wayfinder places --near "Shinjuku, Tokyo" [--type restaurant|coffee] [--limit N] [--json]

Setup:
  Runs interactive key setup and stores your SerpApi key in local config.
  --reset                   Remove existing local config and reconfigure

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

Flights booking required:
  --from <IATA>             Origin airport code
  --to <IATA>               Destination airport code
  --date <YYYY-MM-DD>       Departure date
  --token <BOOKING_TOKEN>   Booking token from a flights search result
  (repeat --token to request multiple options)

Hotels required:
  --where <QUERY>           Destination or hotel search query
  --check-in <YYYY-MM-DD>   Check-in date
  --check-out <YYYY-MM-DD>  Check-out date

Hotels optional filters:
  --adults <N>              Number of adults (default 2)
  --max-price <USD>         Max nightly rate in USD
  --rating <3.5|4|4.5|5>    Minimum guest rating

Places required:
  --near <QUERY>            Specific location query, example "Domino Park, Brooklyn, NY"
                            Broad names can return mixed-city results

Places optional filters:
  --type <restaurant|coffee> Place type (default restaurant)
  --limit <N>               Maximum number of results (default 10)

Output:
  --json                    Print structured JSON output`;

export async function runWayfinder(
  argv: string[] = process.argv.slice(2),
  options: RunOptions = {},
): Promise<number> {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir;
  const isInteractive = options.isInteractive ?? Boolean(defaultStdin.isTTY && defaultStdout.isTTY);
  const output = options.output ?? {
    stdout: (message: string) => console.log(message),
    stderr: (message: string) => console.error(message),
  };

  try {
    if (argv.length === 0) {
      try {
        resolveApiKey(env, homeDir);
        output.stdout(HELP_TEXT);
        return ExitCode.Success;
      } catch (error) {
        if (error instanceof CliError && error.exitCode === ExitCode.MissingApiKey) {
          if (!isInteractive) {
            output.stderr(error.message);
            return error.exitCode;
          }

          return await runSetupFlow(output, homeDir, options.promptImpl, isInteractive, false);
        }

        if (error instanceof CliError) {
          output.stderr(error.message);
          return error.exitCode;
        }

        output.stderr("Unexpected internal error");
        return ExitCode.InternalError;
      }
    }

    const parsed = parseCliArgs(argv);

    if (parsed.help) {
      output.stdout(HELP_TEXT);
      return ExitCode.Success;
    }

    if (parsed.mode === "setup") {
      return await runSetupFlow(
        output,
        homeDir,
        options.promptImpl,
        isInteractive,
        parsed.reset,
      );
    }

    const apiKey = resolveApiKey(env, homeDir);
    if (parsed.mode === "flights") {
      const flights = await searchFlights(parsed.query, apiKey, options.fetchImpl ?? fetch);

      if (flights.options.length === 0) {
        throw new CliError("No flights found for the selected query", ExitCode.NoResults);
      }

      if (parsed.outputJson) {
        output.stdout(
          JSON.stringify(
            {
              query: parsed.query,
              googleFlightsUrl: flights.googleFlightsUrl,
              results: flights.options,
            },
            null,
            2,
          ),
        );
      } else {
        output.stdout(renderFlightTable(flights.options));
      }
    } else if (parsed.mode === "flight-booking") {
      const bookingResults = await searchFlightBookingOptions(
        parsed.query,
        apiKey,
        options.fetchImpl ?? fetch,
      );

      const flightLinks = bookingResults
        .filter((result) => typeof result.googleFlightsUrl === "string")
        .map((result) => ({
          token: result.token,
          googleFlightsUrl: result.googleFlightsUrl as string,
        }));

      if (flightLinks.length === 0) {
        throw new CliError(
          "No Google Flights links found for the provided token(s)",
          ExitCode.NoResults,
        );
      }

      if (parsed.outputJson) {
        output.stdout(
          JSON.stringify(
            {
              query: parsed.query,
              results: flightLinks,
            },
            null,
            2,
          ),
        );
      } else {
        output.stdout(renderFlightBookingText(flightLinks));
      }
    } else if (parsed.mode === "hotels") {
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
    } else {
      const places = await searchPlaces(parsed.query, apiKey, options.fetchImpl ?? fetch);

      if (places.length === 0) {
        throw new CliError("No places found for the selected query", ExitCode.NoResults);
      }

      if (parsed.outputJson) {
        output.stdout(
          JSON.stringify(
            {
              query: parsed.query,
              results: places,
            },
            null,
            2,
          ),
        );
      } else {
        output.stdout(renderPlaceTable(places));
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

function renderFlightBookingText(
  results: Array<{ token: string; googleFlightsUrl: string }>,
): string {
  const lines: string[] = [];

  for (const result of results) {
    lines.push(`TOKEN: ${result.token}`);
    lines.push(`GOOGLE FLIGHTS: ${result.googleFlightsUrl}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

async function runSetupFlow(
  output: Output,
  homeDir: string | undefined,
  promptImpl: ((prompt: string) => Promise<string>) | undefined,
  isInteractive: boolean,
  forceReset: boolean,
): Promise<number> {
  if (!isInteractive) {
    throw new CliError(
      "wayfinder setup requires an interactive terminal. Use SERPAPI_API_KEY or write ~/.config/wayfinder/config.json manually.",
      ExitCode.InvalidInput,
    );
  }

  output.stdout("Wayfinder needs a SerpApi API key to fetch live flight and hotel data.");
  output.stdout("SerpApi is the API provider that returns Google Flights and Google Hotels search results.");
  output.stdout("Get your key at: https://serpapi.com/manage-api-key");
  output.stdout("");

  const configPath = getConfigPath(homeDir);
  if (forceReset) {
    if (existsSync(configPath)) {
      unlinkSync(configPath);
      output.stdout("Existing config removed due to --reset.");
    } else {
      output.stdout("No existing config found. Starting fresh setup.");
    }
  }

  const existingKey = readConfigApiKey(homeDir);
  if (existingKey && !forceReset) {
    const overwrite = await promptWithFallback(promptImpl, "A key already exists. Overwrite? [y/N]: ");
    if (!/^(y|yes)$/i.test(overwrite.trim())) {
      output.stdout("Setup cancelled. Existing key kept.");
      return ExitCode.Success;
    }
  }

  let apiKey = "";
  while (apiKey.length === 0) {
    apiKey = (await promptWithFallback(promptImpl, "Enter your SerpApi API key: ")).trim();
    if (apiKey.length === 0) {
      output.stdout("API key cannot be empty.");
    }
  }

  writeConfigApiKey(apiKey, homeDir);
  output.stdout("");
  output.stdout(`Setup complete. Saved key to ${configPath}.`);
  output.stdout("Next step: wayfinder --help");
  output.stdout("Quick start: wayfinder flights --from SFO --to JFK --date 2026-04-10");

  return ExitCode.Success;
}

async function promptWithFallback(
  promptImpl: ((prompt: string) => Promise<string>) | undefined,
  message: string,
): Promise<string> {
  if (promptImpl) {
    return promptImpl(message);
  }

  const rl = createInterface({
    input: defaultStdin,
    output: defaultStdout,
  });

  try {
    return await rl.question(message);
  } finally {
    rl.close();
  }
}
