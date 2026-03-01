# wayfinder

CLI for one way flight search with SerpApi Google Flights.

## Install

```bash
bun install
bun link
```

`bun link` makes the `wayfinder` command available in your shell.

## Setup

Set API key by environment variable (preferred):

```bash
export SERPAPI_API_KEY="your_key"
```

Or store it in `~/.config/wayfinder/config.json`:

```json
{
  "serpApiKey": "your_key"
}
```

## Usage examples

Search one way flights:

```bash
wayfinder --from SFO --to JFK --date 2026-04-10
```

Search with filters:

```bash
wayfinder --from LAX --to SEA --date 2026-04-10 --airline AS --max-stops 0 --max-price 250 --depart-after 06:00 --depart-before 12:00
```

Structured output for scripting:

```bash
wayfinder --from SFO --to JFK --date 2026-04-10 --json | jq '.results[] | {price,airline,stops}'
```
