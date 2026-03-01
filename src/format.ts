import { FlightOption, HotelOption, PlaceOption } from "./types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function renderFlightTable(options: FlightOption[]): string {
  const rows = options.map((option) => ({
    price: currencyFormatter.format(option.price),
    airline: option.airline,
    depart: option.departureTime,
    arrive: option.arrivalTime,
    duration: formatDuration(option.durationMinutes),
    stops: String(option.stops),
  }));

  const headers = {
    price: "PRICE",
    airline: "AIRLINE",
    depart: "DEPART",
    arrive: "ARRIVE",
    duration: "DURATION",
    stops: "STOPS",
  };

  const widths = {
    price: maxWidth(rows, "price", headers.price),
    airline: maxWidth(rows, "airline", headers.airline),
    depart: maxWidth(rows, "depart", headers.depart),
    arrive: maxWidth(rows, "arrive", headers.arrive),
    duration: maxWidth(rows, "duration", headers.duration),
    stops: maxWidth(rows, "stops", headers.stops),
  };

  const lines: string[] = [];

  lines.push(
    [
      headers.price.padEnd(widths.price),
      headers.airline.padEnd(widths.airline),
      headers.depart.padEnd(widths.depart),
      headers.arrive.padEnd(widths.arrive),
      headers.duration.padEnd(widths.duration),
      headers.stops.padEnd(widths.stops),
    ].join("  "),
  );

  lines.push(
    [
      "-".repeat(widths.price),
      "-".repeat(widths.airline),
      "-".repeat(widths.depart),
      "-".repeat(widths.arrive),
      "-".repeat(widths.duration),
      "-".repeat(widths.stops),
    ].join("  "),
  );

  for (const row of rows) {
    lines.push(
      [
        row.price.padEnd(widths.price),
        row.airline.padEnd(widths.airline),
        row.depart.padEnd(widths.depart),
        row.arrive.padEnd(widths.arrive),
        row.duration.padEnd(widths.duration),
        row.stops.padEnd(widths.stops),
      ].join("  "),
    );
  }

  return lines.join("\n");
}

export function renderHotelTable(options: HotelOption[]): string {
  const rows = options.map((option) => ({
    nightly: currencyFormatter.format(option.nightlyPrice),
    total: typeof option.totalPrice === "number" ? currencyFormatter.format(option.totalPrice) : "n/a",
    name: option.name,
    rating: typeof option.rating === "number" ? option.rating.toFixed(1) : "n/a",
    reviews: typeof option.reviews === "number" ? String(option.reviews) : "n/a",
    location: option.location,
  }));

  const headers = {
    nightly: "PRICE/NIGHT",
    total: "TOTAL",
    name: "NAME",
    rating: "RATING",
    reviews: "REVIEWS",
    location: "LOCATION",
  };

  const widths = {
    nightly: maxWidth(rows, "nightly", headers.nightly),
    total: maxWidth(rows, "total", headers.total),
    name: maxWidth(rows, "name", headers.name),
    rating: maxWidth(rows, "rating", headers.rating),
    reviews: maxWidth(rows, "reviews", headers.reviews),
    location: maxWidth(rows, "location", headers.location),
  };

  const lines: string[] = [];

  lines.push(
    [
      headers.nightly.padEnd(widths.nightly),
      headers.total.padEnd(widths.total),
      headers.name.padEnd(widths.name),
      headers.rating.padEnd(widths.rating),
      headers.reviews.padEnd(widths.reviews),
      headers.location.padEnd(widths.location),
    ].join("  "),
  );

  lines.push(
    [
      "-".repeat(widths.nightly),
      "-".repeat(widths.total),
      "-".repeat(widths.name),
      "-".repeat(widths.rating),
      "-".repeat(widths.reviews),
      "-".repeat(widths.location),
    ].join("  "),
  );

  for (const row of rows) {
    lines.push(
      [
        row.nightly.padEnd(widths.nightly),
        row.total.padEnd(widths.total),
        row.name.padEnd(widths.name),
        row.rating.padEnd(widths.rating),
        row.reviews.padEnd(widths.reviews),
        row.location.padEnd(widths.location),
      ].join("  "),
    );
  }

  return lines.join("\n");
}

export function renderPlaceTable(options: PlaceOption[]): string {
  const rows = options.map((option) => ({
    name: option.name,
    type: option.category,
    rating: typeof option.rating === "number" ? option.rating.toFixed(1) : "n/a",
    reviews: typeof option.reviews === "number" ? String(option.reviews) : "n/a",
    distance: formatDistance(option.distanceMeters),
    address: option.address ?? "n/a",
  }));

  const headers = {
    name: "NAME",
    type: "TYPE",
    rating: "RATING",
    reviews: "REVIEWS",
    distance: "DISTANCE",
    address: "ADDRESS",
  };

  const widths = {
    name: maxWidth(rows, "name", headers.name),
    type: maxWidth(rows, "type", headers.type),
    rating: maxWidth(rows, "rating", headers.rating),
    reviews: maxWidth(rows, "reviews", headers.reviews),
    distance: maxWidth(rows, "distance", headers.distance),
    address: maxWidth(rows, "address", headers.address),
  };

  const lines: string[] = [];

  lines.push(
    [
      headers.name.padEnd(widths.name),
      headers.type.padEnd(widths.type),
      headers.rating.padEnd(widths.rating),
      headers.reviews.padEnd(widths.reviews),
      headers.distance.padEnd(widths.distance),
      headers.address.padEnd(widths.address),
    ].join("  "),
  );

  lines.push(
    [
      "-".repeat(widths.name),
      "-".repeat(widths.type),
      "-".repeat(widths.rating),
      "-".repeat(widths.reviews),
      "-".repeat(widths.distance),
      "-".repeat(widths.address),
    ].join("  "),
  );

  for (const row of rows) {
    lines.push(
      [
        row.name.padEnd(widths.name),
        row.type.padEnd(widths.type),
        row.rating.padEnd(widths.rating),
        row.reviews.padEnd(widths.reviews),
        row.distance.padEnd(widths.distance),
        row.address.padEnd(widths.address),
      ].join("  "),
    );
  }

  return lines.join("\n");
}

function maxWidth(rows: Array<Record<string, string>>, key: string, header: string): number {
  return rows.reduce((width, row) => Math.max(width, row[key].length), header.length);
}

function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "n/a";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatDistance(distanceMeters?: number): string {
  if (!Number.isFinite(distanceMeters)) {
    return "n/a";
  }

  if ((distanceMeters as number) < 1000) {
    return `${Math.round(distanceMeters as number)}m`;
  }

  const km = (distanceMeters as number) / 1000;
  return `${km.toFixed(1)}km`;
}
