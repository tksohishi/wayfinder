# 🛫 wayfinder — Travel search for your terminal and your AI agents.

## Install

Requires [Bun](https://bun.sh/) runtime.

```bash
bun install -g @tks/wayfinder
```

Or install from source:

```bash
git clone https://github.com/tksohishi/wayfinder.git
cd wayfinder
bun install
bun link
```

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
