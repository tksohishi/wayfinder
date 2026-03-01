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
          search_metadata: {
            google_flights_url: "https://www.google.com/travel/flights/search?tfs=test",
          },
          best_flights: [
            {
              price: 310,
              booking_token: "token-2",
              flights: [
                {
                  airline: "Delta",
                  duration: 360,
                  departure_airport: { time: "2099-03-20 08:00" },
                  arrival_airport: { time: "2099-03-20 14:00" },
                },
              ],
            },
            {
              price: 250,
              booking_token: "token-1",
              flights: [
                {
                  airline: "Delta",
                  duration: 360,
                  departure_airport: { time: "2099-03-20 06:00" },
                  arrival_airport: { time: "2099-03-20 12:00" },
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
    const payload = JSON.parse(stdout[0] as string) as {
      googleFlightsUrl?: string;
      query: { excludeBasic?: boolean };
      results: Array<{ departureTime: string; bookingToken?: string }>;
    };

    expect(payload.query.excludeBasic).toBeTrue();
    expect(payload.googleFlightsUrl).toBe("https://www.google.com/travel/flights/search?tfs=test");
    expect(payload.results[0]?.departureTime).toBe("2099-03-20 06:00");
    expect(payload.results[1]?.departureTime).toBe("2099-03-20 08:00");
    expect(payload.results[0]?.bookingToken).toBe("token-1");
    expect(payload.results[1]?.bookingToken).toBe("token-2");
  });

  test("fetches booking links for multiple tokens", async () => {
    const urls: string[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      const parsed = new URL(url);
      const token = parsed.searchParams.get("booking_token");

      if (token === "abc") {
        return new Response(
          JSON.stringify({
            search_metadata: {
              google_flights_url: "https://www.google.com/travel/flights/search?tfs=abc",
            },
            booking_options: [
              {
                source: "Delta",
                price: 320,
                booking_request: {
                  url: "https://example.com/book/abc",
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          search_metadata: {
            google_flights_url: "https://www.google.com/travel/flights/search?tfs=def",
          },
          booking_options: [
            {
              source: "Partner",
              price: 305,
              booking_request: {
                url: "https://example.com/book/def",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const code = await runWayfinder(
      [
        "flights",
        "booking",
        "--from",
        "LAS",
        "--to",
        "JFK",
        "--date",
        "2099-05-29",
        "--token",
        "abc",
        "--token",
        "def",
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
    expect(urls[0]).toContain("engine=google_flights");
    expect(urls[1]).toContain("engine=google_flights");
    expect(urls[0]).toContain("departure_id=LAS");
    expect(urls[0]).toContain("arrival_id=JFK");
    expect(urls[0]).toContain("outbound_date=2099-05-29");

    const payload = JSON.parse(stdout[0] as string) as {
      query: { origin: string; destination: string; departureDate: string; tokens: string[] };
      results: Array<{ token: string; googleFlightsUrl: string }>;
    };

    expect(payload.query.origin).toBe("LAS");
    expect(payload.query.destination).toBe("JFK");
    expect(payload.query.departureDate).toBe("2099-05-29");
    expect(payload.query.tokens).toEqual(["abc", "def"]);
    expect(payload.results).toHaveLength(2);
    expect(payload.results[0]?.token).toBe("abc");
    expect(payload.results[1]?.token).toBe("def");
    expect(payload.results[0]?.googleFlightsUrl).toContain("google.com/travel/flights/search");
    expect(payload.results[1]?.googleFlightsUrl).toContain("google.com/travel/flights/search");
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
