import { describe, expect, test } from "bun:test";
import { parseCliArgs } from "../src/parse";

describe("parseCliArgs", () => {
  test("parses flight arguments and optional filters", () => {
    const parsed = parseCliArgs([
      "flights",
      "--from",
      "sfo",
      "--to",
      "jfk",
      "--date",
      "2099-03-20",
      "--airline",
      "ua",
      "--max-stops",
      "1",
      "--max-price",
      "400",
      "--depart-after",
      "06:30",
      "--depart-before",
      "12:45",
      "--exclude-basic",
      "--json",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.outputJson).toBeTrue();
    expect(parsed.mode).toBe("flights");
    expect(parsed.query).toEqual({
      origin: "SFO",
      destination: "JFK",
      departureDate: "2099-03-20",
      airlineCode: "UA",
      maxStops: 1,
      maxPrice: 400,
      departureAfterMinutes: 390,
      departureBeforeMinutes: 765,
      excludeBasic: true,
    });
  });

  test("accepts flights one-way subcommand prefix", () => {
    const parsed = parseCliArgs([
      "flights",
      "one-way",
      "--from",
      "LAX",
      "--to",
      "SEA",
      "--date",
      "2099-01-10",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("flights");
    expect(parsed.query.origin).toBe("LAX");
    expect(parsed.query.destination).toBe("SEA");
  });

  test("parses repeated flight dates as multi-date query", () => {
    const parsed = parseCliArgs([
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
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("flights");
    expect(parsed.query).toEqual({
      origin: "SFO",
      destination: "JFK",
      departureDates: ["2099-03-20", "2099-03-21"],
      airlineCode: undefined,
      maxStops: undefined,
      maxPrice: undefined,
      departureAfterMinutes: undefined,
      departureBeforeMinutes: undefined,
      excludeBasic: undefined,
    });
  });

  test("parses hotels args and defaults adults to 2", () => {
    const parsed = parseCliArgs([
      "hotels",
      "--where",
      "New York, NY",
      "--check-in",
      "2099-04-10",
      "--check-out",
      "2099-04-12",
      "--min-price",
      "200",
      "--max-price",
      "350",
      "--rating",
      "4.5",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("hotels");
    expect(parsed.query).toEqual({
      location: "New York, NY",
      checkInDate: "2099-04-10",
      checkOutDate: "2099-04-12",
      adults: 2,
      children: 0,
      childrenAges: undefined,
      freeCancellation: undefined,
      hotelClasses: undefined,
      minPrice: 200,
      maxPrice: 350,
      minRating: 4.5,
    });
  });

  test("accepts equal hotel min and max price bounds", () => {
    const parsed = parseCliArgs([
      "hotels",
      "--where",
      "Osaka",
      "--check-in",
      "2099-04-10",
      "--check-out",
      "2099-04-12",
      "--min-price",
      "300",
      "--max-price",
      "300",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("hotels");
    expect(parsed.query.minPrice).toBe(300);
    expect(parsed.query.maxPrice).toBe(300);
  });

  test("parses hotels args with family and class filters", () => {
    const parsed = parseCliArgs([
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
      "7,4",
      "--free-cancellation",
      "--hotel-class",
      "5,4,4",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("hotels");
    expect(parsed.query).toEqual({
      location: "Tokyo",
      checkInDate: "2099-04-10",
      checkOutDate: "2099-04-13",
      adults: 2,
      children: 2,
      childrenAges: [7, 4],
      freeCancellation: true,
      hotelClasses: [4, 5],
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
    });
  });

  test("parses flights booking with multiple tokens", () => {
    const parsed = parseCliArgs([
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
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("flight-booking");
    expect(parsed.outputJson).toBeTrue();
    expect(parsed.query).toEqual({
      origin: "LAS",
      destination: "JFK",
      departureDate: "2099-05-29",
      tokens: ["abc", "def"],
    });
  });

  test("parses places args with defaults", () => {
    const parsed = parseCliArgs(["places", "--near", "Shinjuku, Tokyo"]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("places");
    expect(parsed.query).toEqual({
      near: "Shinjuku, Tokyo",
      type: "restaurant",
      limit: 10,
    });
  });

  test("parses places args with explicit type and limit", () => {
    const parsed = parseCliArgs([
      "places",
      "--near",
      "Kyoto Station",
      "--type",
      "coffee",
      "--limit",
      "5",
      "--json",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("places");
    expect(parsed.outputJson).toBeTrue();
    expect(parsed.query).toEqual({
      near: "Kyoto Station",
      type: "coffee",
      limit: 5,
    });
  });

  test("parses places args with walk range", () => {
    const parsed = parseCliArgs([
      "places",
      "--near",
      "Domino Park, Brooklyn, NY",
      "--range",
      "walk",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("places");
    expect(parsed.query.range).toBe("walk");
  });

  test("parses setup mode", () => {
    const parsed = parseCliArgs(["setup"]);
    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("setup");
    expect(parsed.reset).toBeFalse();
  });

  test("parses setup reset mode", () => {
    const parsed = parseCliArgs(["setup", "--reset"]);
    expect(parsed.help).toBeFalse();
    expect(parsed.mode).toBe("setup");
    expect(parsed.reset).toBeTrue();
  });

  test("rejects invalid airport code", () => {
    expect(() =>
      parseCliArgs(["flights", "--from", "SF", "--to", "JFK", "--date", "2099-03-20"]),
    ).toThrow("Invalid origin airport code");
  });

  test("requires both departure time flags", () => {
    expect(() =>
      parseCliArgs([
        "flights",
        "--from",
        "SFO",
        "--to",
        "JFK",
        "--date",
        "2099-03-20",
        "--depart-after",
        "09:00",
      ]),
    ).toThrow("Departure window requires both --depart-after and --depart-before");
  });

  test("rejects command without subcommand", () => {
    expect(() => parseCliArgs(["--from", "SFO", "--to", "JFK", "--date", "2099-03-20"])).toThrow(
      "Missing subcommand: use `setup`, `flights`, `hotels`, or `places`",
    );
  });

  test("rejects unknown setup argument", () => {
    expect(() => parseCliArgs(["setup", "--bad"])).toThrow("Unknown argument for setup");
  });

  test("rejects invalid hotel rating", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--rating",
        "4.2",
      ]),
    ).toThrow("--rating must be one of: 3.5, 4, 4.5, 5");
  });

  test("rejects invalid hotel min price", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--min-price",
        "0",
      ]),
    ).toThrow("--min-price must be a positive integer");
  });

  test("rejects missing value for hotel min price", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--min-price",
      ]),
    ).toThrow("Missing value for --min-price");
  });

  test("rejects hotel min price greater than max price", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--min-price",
        "400",
        "--max-price",
        "300",
      ]),
    ).toThrow("--min-price cannot be greater than --max-price");
  });

  test("rejects invalid children count", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--children",
        "0",
      ]),
    ).toThrow("--children must be a positive integer");
  });

  test("rejects missing value for children", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--children",
      ]),
    ).toThrow("Missing value for --children");
  });

  test("rejects invalid children ages format", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--children",
        "2",
        "--children-ages",
        "4,,7",
      ]),
    ).toThrow("--children-ages must be a comma-separated list of ages 1 through 17");
  });

  test("rejects missing value for children ages", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--children-ages",
      ]),
    ).toThrow("Missing value for --children-ages");
  });

  test("rejects children ages outside the supported range", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--children",
        "1",
        "--children-ages",
        "18",
      ]),
    ).toThrow("--children-ages ages must be between 1 and 17");
  });

  test("rejects children ages without children", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--children-ages",
        "7",
      ]),
    ).toThrow("--children-ages requires --children");
  });

  test("rejects mismatched children age count", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--children",
        "2",
        "--children-ages",
        "7",
      ]),
    ).toThrow("--children-ages count must match --children");
  });

  test("rejects invalid hotel class values", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--hotel-class",
        "4,6",
      ]),
    ).toThrow("--hotel-class must be a comma-separated list of: 2, 3, 4, 5");
  });

  test("rejects missing value for hotel class", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-22",
        "--hotel-class",
      ]),
    ).toThrow("Missing value for --hotel-class");
  });

  test("rejects hotel check-out date that is not after check-in", () => {
    expect(() =>
      parseCliArgs([
        "hotels",
        "--where",
        "Seattle",
        "--check-in",
        "2099-03-20",
        "--check-out",
        "2099-03-20",
      ]),
    ).toThrow("Check-out date must be after check-in date");
  });

  test("requires token for flights booking", () => {
    expect(() => parseCliArgs(["flights", "booking"])).toThrow(
      "Missing required flags: --from, --to, --date",
    );
  });

  test("rejects more than three unique flight dates", () => {
    expect(() =>
      parseCliArgs([
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
      ]),
    ).toThrow("Too many dates: maximum 3 unique --date values per search");
  });

  test("rejects places command without near flag", () => {
    expect(() => parseCliArgs(["places"])).toThrow("Missing required flag: --near");
  });

  test("rejects invalid place type", () => {
    expect(() => parseCliArgs(["places", "--near", "Tokyo", "--type", "bar"])).toThrow(
      "--type must be one of: restaurant, coffee",
    );
  });

  test("rejects invalid places limit", () => {
    expect(() => parseCliArgs(["places", "--near", "Tokyo", "--limit", "0"])).toThrow(
      "--limit must be a positive integer",
    );
  });

  test("rejects invalid places range", () => {
    expect(() => parseCliArgs(["places", "--near", "Tokyo", "--range", "drive"])).toThrow(
      "--range must be: walk",
    );
  });
});
