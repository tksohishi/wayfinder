import { describe, expect, test } from "bun:test";
import { runWayfinder } from "../src/cli";
import { ExitCode } from "../src/types";
import { mkdtempSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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

  test("runs multi-date flight search and groups json output by date", async () => {
    const urls: string[] = [];
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      const date = new URL(url).searchParams.get("outbound_date");
      const hour = date === "2099-03-21" ? "10:00" : "08:00";
      const price = date === "2099-03-21" ? 220 : 200;

      return new Response(
        JSON.stringify({
          search_metadata: {
            google_flights_url: `https://www.google.com/travel/flights/search?tfs=${date}`,
          },
          best_flights: [
            {
              price,
              booking_token: `token-${date}`,
              flights: [
                {
                  airline: "Delta",
                  duration: 360,
                  departure_airport: { time: `${date} ${hour}` },
                  arrival_airport: { time: `${date} 14:00` },
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
        "--date",
        "2099-03-21",
        "--date",
        "2099-03-20",
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
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("outbound_date=2099-03-20");
    expect(urls[1]).toContain("outbound_date=2099-03-21");

    const payload = JSON.parse(stdout[0] as string) as {
      query: { departureDates: string[] };
      resultsByDate: Array<{ date: string; results: Array<{ departureTime: string }> }>;
    };
    expect(payload.query.departureDates).toEqual(["2099-03-20", "2099-03-21"]);
    expect(payload.resultsByDate).toHaveLength(2);
    expect(payload.resultsByDate[0]?.date).toBe("2099-03-20");
    expect(payload.resultsByDate[1]?.date).toBe("2099-03-21");
    expect(payload.resultsByDate[0]?.results[0]?.departureTime).toBe("2099-03-20 08:00");
    expect(payload.resultsByDate[1]?.results[0]?.departureTime).toBe("2099-03-21 10:00");
  });

  test("returns invalid input when more than three unique dates are provided", async () => {
    let fetchCalled = false;
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async () => {
      fetchCalled = true;
      throw new Error("fetch should not be called");
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
        "--date",
        "2099-03-21",
        "--date",
        "2099-03-22",
        "--date",
        "2099-03-23",
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

    expect(code).toBe(ExitCode.InvalidInput);
    expect(fetchCalled).toBeFalse();
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toBe("Too many dates: maximum 3 unique --date values per search");
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
    expect(requestedUrl).toContain("children=0");
    expect(requestedUrl).toContain("rating=9");
    const payload = JSON.parse(stdout[0] as string) as {
      query: { location: string; children: number };
      results: Array<{ name: string; nightlyPrice: number }>;
    };

    expect(payload.query.location).toBe("Seattle, WA");
    expect(payload.query.children).toBe(0);
    expect(payload.results[0]?.name).toBe("Hotel One");
    expect(payload.results[1]?.name).toBe("Hotel Two");
  });

  test("runs hotel search with family and cancellation filters", async () => {
    let requestedUrl = "";
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);

      return new Response(
        JSON.stringify({
          properties: [
            {
              name: "Hotel Family",
              rate_per_night: { lowest: 240 },
              total_rate: { lowest: 720 },
              overall_rating: 4.7,
              reviews: 410,
              description: "Central",
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
        "Tokyo",
        "--check-in",
        "2099-04-10",
        "--check-out",
        "2099-04-13",
        "--adults",
        "2",
        "--children",
        "2",
        "--children-ages",
        "4,7",
        "--free-cancellation",
        "--hotel-class",
        "5,4,4",
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
    expect(requestedUrl).toContain("children=2");
    expect(requestedUrl).toContain("children_ages=4%2C7");
    expect(requestedUrl).toContain("free_cancellation=true");
    expect(requestedUrl).toContain("hotel_class=4%2C5");
    const payload = JSON.parse(stdout[0] as string) as {
      query: {
        children: number;
        childrenAges?: number[];
        freeCancellation?: boolean;
        hotelClasses?: number[];
      };
      results: Array<{ name: string }>;
    };

    expect(payload.query.children).toBe(2);
    expect(payload.query.childrenAges).toEqual([4, 7]);
    expect(payload.query.freeCancellation).toBeTrue();
    expect(payload.query.hotelClasses).toEqual([4, 5]);
    expect(payload.results[0]?.name).toBe("Hotel Family");
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

  test("runs places search with json output", async () => {
    let requestedUrl = "";
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);

      return new Response(
        JSON.stringify({
          local_results: [
            {
              title: "Cafe A",
              rating: 4.6,
              reviews: 210,
              address: "Shinjuku",
              distance: "0.3 km",
              open_state: "Open",
            },
            {
              title: "Cafe B",
              rating: 4.3,
              reviews: 75,
              address: "Shinjuku",
              distance: "0.2 km",
              open_state: "Open",
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
        "places",
        "--near",
        "Shinjuku, Tokyo",
        "--type",
        "coffee",
        "--range",
        "walk",
        "--limit",
        "1",
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
    expect(requestedUrl).toContain("engine=google_maps");
    expect(requestedUrl).toContain("type=search");
    expect(requestedUrl).toContain("coffee");
    expect(requestedUrl).toContain("walking");
    const payload = JSON.parse(stdout[0] as string) as {
      query: { near: string; type: string; limit: number; range?: string };
      results: Array<{ name: string }>;
    };

    expect(payload.query.near).toBe("Shinjuku, Tokyo");
    expect(payload.query.type).toBe("coffee");
    expect(payload.query.limit).toBe(1);
    expect(payload.query.range).toBe("walk");
    expect(payload.results).toHaveLength(1);
  });

  test("returns no results exit code when places list is empty", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ local_results: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });

    const code = await runWayfinder(
      [
        "places",
        "--near",
        "Shinjuku, Tokyo",
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
    expect(stderr[0]).toContain("No places found");
  });

  test("runs setup and writes config file", async () => {
    const homeDir = mkdtempSync(path.join(tmpdir(), "wayfinder-setup-"));
    const stdout: string[] = [];
    const stderr: string[] = [];

    const code = await runWayfinder(["setup"], {
      homeDir,
      isInteractive: true,
      promptImpl: async (message: string) => {
        if (message.includes("Enter your SerpApi API key")) {
          return "abc123";
        }
        return "y";
      },
      output: {
        stdout: (value: string) => stdout.push(value),
        stderr: (value: string) => stderr.push(value),
      },
    });

    const saved = JSON.parse(
      readFileSync(path.join(homeDir, ".config", "wayfinder", "config.json"), "utf8"),
    ) as { serpApiKey: string };

    expect(code).toBe(ExitCode.Success);
    expect(stderr).toHaveLength(0);
    expect(saved.serpApiKey).toBe("abc123");
    expect(stdout.join("\n")).toContain("Setup complete");
  });

  test("auto-runs setup on bare command when missing key in interactive mode", async () => {
    const homeDir = mkdtempSync(path.join(tmpdir(), "wayfinder-bare-"));
    const stdout: string[] = [];
    const stderr: string[] = [];

    const code = await runWayfinder([], {
      homeDir,
      isInteractive: true,
      promptImpl: async () => "abc123",
      output: {
        stdout: (value: string) => stdout.push(value),
        stderr: (value: string) => stderr.push(value),
      },
    });

    expect(code).toBe(ExitCode.Success);
    expect(stderr).toHaveLength(0);
    expect(stdout.join("\n")).toContain("Wayfinder needs a SerpApi API key");
  });

  test("bare command in non-interactive mode prints actionable missing key message", async () => {
    const homeDir = mkdtempSync(path.join(tmpdir(), "wayfinder-non-interactive-"));
    const stdout: string[] = [];
    const stderr: string[] = [];

    const code = await runWayfinder([], {
      homeDir,
      isInteractive: false,
      output: {
        stdout: (value: string) => stdout.push(value),
        stderr: (value: string) => stderr.push(value),
      },
    });

    expect(code).toBe(ExitCode.MissingApiKey);
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toContain("Missing SerpApi API key");
    expect(stderr[0]).toContain("wayfinder setup");
  });

  test("setup reset overwrites existing key without confirmation prompt", async () => {
    const homeDir = mkdtempSync(path.join(tmpdir(), "wayfinder-setup-reset-"));
    const configDir = path.join(homeDir, ".config", "wayfinder");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      path.join(configDir, "config.json"),
      `${JSON.stringify({ serpApiKey: "old-key" }, null, 2)}\n`,
      "utf8",
    );

    const stdout: string[] = [];
    const stderr: string[] = [];

    const code = await runWayfinder(["setup", "--reset"], {
      homeDir,
      isInteractive: true,
      promptImpl: async (message: string) => {
        if (message.includes("Overwrite")) {
          throw new Error("overwrite prompt should not be called for --reset");
        }
        return "new-key";
      },
      output: {
        stdout: (value: string) => stdout.push(value),
        stderr: (value: string) => stderr.push(value),
      },
    });

    const saved = JSON.parse(
      readFileSync(path.join(homeDir, ".config", "wayfinder", "config.json"), "utf8"),
    ) as { serpApiKey: string };

    expect(code).toBe(ExitCode.Success);
    expect(stderr).toHaveLength(0);
    expect(saved.serpApiKey).toBe("new-key");
    expect(stdout.join("\n")).toContain("Existing config removed due to --reset.");
    expect(stdout.join("\n")).toContain("Setup complete");
  });
});
