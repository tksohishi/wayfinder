import { describe, expect, test } from "bun:test";
import { filterByDepartureWindow, shapeSerpApiResponse } from "../src/serpapi";

describe("shapeSerpApiResponse", () => {
  test("maps SerpApi itineraries to flight options", () => {
    const payload = {
      best_flights: [
        {
          price: 312,
          total_duration: 380,
          flights: [
            {
              airline: "Delta",
              duration: 180,
              departure_airport: { time: "2026-05-01 07:10" },
              arrival_airport: { time: "2026-05-01 10:10" },
            },
            {
              airline: "Delta",
              duration: 200,
              departure_airport: { time: "2026-05-01 11:30" },
              arrival_airport: { time: "2026-05-01 14:30" },
            },
          ],
        },
      ],
      other_flights: [
        {
          price: 199,
          flights: [
            {
              airline: "JetBlue",
              duration: 320,
              departure_airport: { time: "2026-05-01 09:05" },
              arrival_airport: { time: "2026-05-01 14:25" },
            },
          ],
        },
        {
          price: 150,
          flights: [],
        },
      ],
    };

    const shaped = shapeSerpApiResponse(payload);

    expect(shaped).toHaveLength(2);
    expect(shaped[0]).toEqual({
      price: 312,
      airline: "Delta",
      departureTime: "2026-05-01 07:10",
      arrivalTime: "2026-05-01 14:30",
      durationMinutes: 380,
      stops: 1,
    });
    expect(shaped[1]).toEqual({
      price: 199,
      airline: "JetBlue",
      departureTime: "2026-05-01 09:05",
      arrivalTime: "2026-05-01 14:25",
      durationMinutes: 320,
      stops: 0,
    });
  });

  test("filters by departure window", () => {
    const options = [
      {
        price: 100,
        airline: "A",
        departureTime: "2026-05-01 06:15",
        arrivalTime: "2026-05-01 07:15",
        durationMinutes: 60,
        stops: 0,
      },
      {
        price: 120,
        airline: "B",
        departureTime: "2026-05-01 09:45",
        arrivalTime: "2026-05-01 10:45",
        durationMinutes: 60,
        stops: 0,
      },
    ];

    const filtered = filterByDepartureWindow(options, 9 * 60, 10 * 60);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.airline).toBe("B");
  });
});
