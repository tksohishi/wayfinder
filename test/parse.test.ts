import { describe, expect, test } from "bun:test";
import { parseCliArgs } from "../src/parse";

describe("parseCliArgs", () => {
  test("parses required arguments and optional filters", () => {
    const parsed = parseCliArgs([
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
      "--json",
    ]);

    expect(parsed.help).toBeFalse();
    expect(parsed.outputJson).toBeTrue();
    expect(parsed.query).toEqual({
      origin: "SFO",
      destination: "JFK",
      departureDate: "2099-03-20",
      airlineCode: "UA",
      maxStops: 1,
      maxPrice: 400,
      departureAfterMinutes: 390,
      departureBeforeMinutes: 765,
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
    expect(parsed.query?.origin).toBe("LAX");
    expect(parsed.query?.destination).toBe("SEA");
  });

  test("rejects invalid airport code", () => {
    expect(() =>
      parseCliArgs(["--from", "SF", "--to", "JFK", "--date", "2099-03-20"]),
    ).toThrow("Invalid origin airport code");
  });

  test("requires both departure time flags", () => {
    expect(() =>
      parseCliArgs([
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
});
