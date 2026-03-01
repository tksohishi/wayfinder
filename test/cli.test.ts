import { describe, expect, test } from "bun:test";
import { runWayfinder } from "../src/cli";
import { ExitCode } from "../src/types";

describe("runWayfinder", () => {
  test("runs flight search with exclude basic filter", async () => {
    let requestedUrl = "";
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);

      return new Response(
        JSON.stringify({
          best_flights: [
            {
              price: 310,
              flights: [
                {
                  airline: "Delta",
                  duration: 360,
                  departure_airport: { time: "2099-03-20 08:00" },
                  arrival_airport: { time: "2099-03-20 14:00" },
                },
              ],
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const code = await runWayfinder(
      [
        "flights",
        "--from",
        "SFO",
        "--to",
        "JFK",
        "--date",
        "2099-03-20",
        "--exclude-basic",
        "--json",
      ],
      {
        env: { SERPAPI_API_KEY: "test-key" },
        fetchImpl,
        output: {
          stdout: (value: string) => stdout.push(value),
          stderr: (value: string) => stderr.push(value),
        },
      },
    );

    expect(code).toBe(ExitCode.Success);
    expect(stderr).toHaveLength(0);
    expect(requestedUrl).toContain("engine=google_flights");
    expect(requestedUrl).toContain("exclude_basic=true");
    expect(requestedUrl).toContain("travel_class=1");
    expect(requestedUrl).toContain("gl=us");
    expect(stdout[0]).toContain("\"excludeBasic\": true");
  });

  test("runs hotel search with json output", async () => {
    let requestedUrl = "";
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);

      return new Response(
        JSON.stringify({
          properties: [
            {
              name: "Hotel Two",
              rate_per_night: { lowest: 220 },
              total_rate: { lowest: 440 },
              overall_rating: 4.1,
              reviews: 210,
              description: "Downtown",
            },
            {
              name: "Hotel One",
              rate_per_night: { lowest: 180 },
              total_rate: { lowest: 360 },
              overall_rating: 4.6,
              reviews: 500,
              description: "Waterfront",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const code = await runWayfinder(
      [
        "hotels",
        "--where",
        "Seattle, WA",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--rating",
        "4.5",
        "--json",
      ],
      {
        env: { SERPAPI_API_KEY: "test-key" },
        fetchImpl,
        output: {
          stdout: (value: string) => stdout.push(value),
          stderr: (value: string) => stderr.push(value),
        },
      },
    );

    expect(code).toBe(ExitCode.Success);
    expect(stderr).toHaveLength(0);
    expect(requestedUrl).toContain("engine=google_hotels");
    expect(requestedUrl).toContain("rating=9");
    const payload = JSON.parse(stdout[0] as string) as {
      query: { location: string };
      results: Array<{ name: string; nightlyPrice: number }>;
    };

    expect(payload.query.location).toBe("Seattle, WA");
    expect(payload.results[0]?.name).toBe("Hotel One");
    expect(payload.results[1]?.name).toBe("Hotel Two");
  });

  test("returns no results exit code when hotel properties are empty", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ properties: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });

    const code = await runWayfinder(
      [
        "hotels",
        "--where",
        "Seattle, WA",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
      ],
      {
        env: { SERPAPI_API_KEY: "test-key" },
        fetchImpl,
        output: {
          stdout: (value: string) => stdout.push(value),
          stderr: (value: string) => stderr.push(value),
        },
      },
    );

    expect(code).toBe(ExitCode.NoResults);
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toContain("No hotels found");
  });
});
