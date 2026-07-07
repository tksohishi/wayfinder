import { describe, expect, test } from "bun:test";
import {
  filterByDepartureWindow,
  shapeHotelSerpApiResponse,
  shapePlaceSerpApiResponse,
  shapeSerpApiResponse,
} from "../src/serpapi";

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
              travel_class: "Premium economy",
              duration: 180,
              departure_airport: { time: "2026-05-01 07:10" },
              arrival_airport: { time: "2026-05-01 10:10" },
            },
            {
              airline: "Delta",
              travel_class: "Premium economy",
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
      cabin: "Premium economy",
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

  test("passes eastbound arrival time and duration through verbatim (no tz math)", () => {
    // PSP -> SLC -> JFK. Airport-local times; 06:00 PT + 528m = 17:48 ET.
    const payload = {
      best_flights: [
        {
          price: 344,
          total_duration: 528,
          flights: [
            {
              airline: "Delta",
              duration: 110,
              departure_airport: { time: "2026-09-07 06:00" },
              arrival_airport: { time: "2026-09-07 08:50" },
            },
            {
              airline: "Delta",
              duration: 318,
              departure_airport: { time: "2026-09-07 10:30" },
              arrival_airport: { time: "2026-09-07 17:48" },
            },
          ],
        },
      ],
    };

    const shaped = shapeSerpApiResponse(payload);

    expect(shaped).toHaveLength(1);
    expect(shaped[0]?.departureTime).toBe("2026-09-07 06:00");
    expect(shaped[0]?.arrivalTime).toBe("2026-09-07 17:48");
    expect(shaped[0]?.durationMinutes).toBe(528);
  });

  test("passes westbound arrival time and duration through verbatim (no tz math)", () => {
    // JFK -> DFW -> PSP. Airport-local times; 06:54 ET + 479m = 11:53 PT.
    const payload = {
      best_flights: [
        {
          price: 297,
          total_duration: 479,
          flights: [
            {
              airline: "American",
              duration: 245,
              departure_airport: { time: "2026-09-04 06:54" },
              arrival_airport: { time: "2026-09-04 09:59" },
            },
            {
              airline: "American",
              duration: 180,
              departure_airport: { time: "2026-09-04 10:53" },
              arrival_airport: { time: "2026-09-04 11:53" },
            },
          ],
        },
      ],
    };

    const shaped = shapeSerpApiResponse(payload);

    expect(shaped).toHaveLength(1);
    expect(shaped[0]?.departureTime).toBe("2026-09-04 06:54");
    expect(shaped[0]?.arrivalTime).toBe("2026-09-04 11:53");
    expect(shaped[0]?.durationMinutes).toBe(479);
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

describe("shapeHotelSerpApiResponse", () => {
  test("maps hotel properties and skips missing prices", () => {
    const payload = {
      properties: [
        {
          name: "Hotel One",
          rate_per_night: { lowest: 180 },
          total_rate: { lowest: 420 },
          overall_rating: 4.3,
          reviews: 1280,
          description: "Midtown Manhattan",
          link: "https://example.com/hotel-one",
        },
        {
          name: "Hotel Two",
          rate_per_night: { extracted_lowest: 150 },
          overall_rating: 4.0,
          reviews: 880,
          type: "Resort hotel",
        },
        {
          name: "Invalid Hotel",
          total_rate: { lowest: 500 },
        },
      ],
    };

    const shaped = shapeHotelSerpApiResponse(payload);

    expect(shaped).toHaveLength(2);
    expect(shaped[0]).toEqual({
      name: "Hotel One",
      nightlyPrice: 180,
      totalPrice: 420,
      rating: 4.3,
      reviews: 1280,
      location: "Midtown Manhattan",
      link: "https://example.com/hotel-one",
    });
    expect(shaped[1]).toEqual({
      name: "Hotel Two",
      nightlyPrice: 150,
      totalPrice: undefined,
      rating: 4,
      reviews: 880,
      location: "Resort hotel",
      link: undefined,
    });
  });
});

describe("shapePlaceSerpApiResponse", () => {
  test("maps local results and filters invalid rows", () => {
    const payload = {
      local_results: [
        {
          title: "Cafe One",
          rating: 4.6,
          reviews: 180,
          address: "Shinjuku",
          distance: "0.4 km",
          open_state: "Open",
          place_id_search: "https://serpapi.com/search.json?engine=google_maps&place_id=abc",
        },
        {
          title: "No Distance Coffee",
          rating: 4.2,
          reviews: 20,
          address: "Shibuya",
        },
        {
          title: "",
          rating: 5,
        },
      ],
    };

    const shaped = shapePlaceSerpApiResponse(payload, "coffee");

    expect(shaped).toHaveLength(2);
    expect(shaped[0]?.name).toBe("Cafe One");
    expect(shaped[0]?.category).toBe("coffee");
    expect(shaped[0]?.distanceMeters).toBe(400);
    expect(shaped[0]?.openState).toBe("Open");
    expect(shaped[0]?.link).toContain("engine=google_maps");
    expect(shaped[0]?.googleMapsUrl).toBe(
      "https://www.google.com/maps/place/?q=place_id:abc",
    );
    expect(typeof shaped[0]?.score).toBe("number");
  });

  test("ranking score favors higher quality and reasonable distance", () => {
    const payload = {
      local_results: [
        {
          title: "Top Pick",
          rating: 4.8,
          reviews: 300,
          distance: "0.5 km",
        },
        {
          title: "Far But Great",
          rating: 4.9,
          reviews: 320,
          distance: "8 km",
        },
      ],
    };

    const shaped = shapePlaceSerpApiResponse(payload, "restaurant");
    const sorted = [...shaped].sort((a, b) => b.score - a.score);

    expect(sorted[0]?.name).toBe("Top Pick");
  });
});
