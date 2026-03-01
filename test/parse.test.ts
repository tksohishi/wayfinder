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

  test("parses hotels args and defaults adults to 2", () => {
    const parsed = parseCliArgs([
      "hotels",
      "--where",
      "New York, NY",
      "--check-in",
      "2099-04-10",
      "--check-out",
      "2099-04-12",
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
      maxPrice: 350,
      minRating: 4.5,
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
      "Missing subcommand: use `flights` or `hotels`",
    );
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
});
