# 🛫 wayfinder — Travel search for your terminal and your AI agents.

## Install

Primary install method:

```bash
brew install tksohishi/tap/wayfinder
```

Secondary fallback method (requires [Bun](https://bun.sh/) runtime):

```bash
bun install -g @tks/wayfinder
```

Install from source:

```bash
git clone https://github.com/tksohishi/wayfinder.git
cd wayfinder
bun install
bun link
```

## Setup

First run:

```bash
wayfinder setup
```

This interactive command explains why the key is needed, where to get it, and saves it to your local config.
SerpApi is the API provider wayfinder uses to fetch Google Flights and Google Hotels results.

Advanced alternatives:

Set API key by environment variable:

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
wayfinder flights --from SFO --to JFK --date 2026-04-10
```

Search with filters:

```bash
wayfinder flights --from LAX --to SEA --date 2026-04-10 --airline AS --max-stops 0 --max-price 250 --depart-after 06:00 --depart-before 12:00
```

Exclude basic economy fares:

```bash
wayfinder flights --from SFO --to JFK --date 2026-04-10 --exclude-basic
```

Structured output for scripting:

```bash
wayfinder flights --from SFO --to JFK --date 2026-04-10 --json | jq '.results[] | {price,airline,stops}'
```

Get booking links from selected flight tokens:

```bash
wayfinder flights booking --from LAS --to JFK --date 2026-05-29 --token "<TOKEN_1>" --token "<TOKEN_2>" --json
```

Search hotels:

```bash
wayfinder hotels --where "New York, NY" --check-in 2026-04-10 --check-out 2026-04-12
```

Search hotels with filters:

```bash
wayfinder hotels --where "Tokyo" --check-in 2026-04-10 --check-out 2026-04-13 --adults 2 --max-price 300 --rating 4
```

Structured hotel output for scripting:

```bash
wayfinder hotels --where "Paris" --check-in 2026-04-10 --check-out 2026-04-12 --json | jq '.results[] | {name,nightlyPrice,rating}'
```
