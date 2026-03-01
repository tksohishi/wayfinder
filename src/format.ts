import { FlightOption } from "./types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function renderTable(options: FlightOption[]): string {
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

function maxWidth(
  rows: Array<Record<string, string>>,
  key: string,
  header: string,
): number {
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
