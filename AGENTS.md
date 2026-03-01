# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Summary

CLI tool for one-way flight search using the SerpApi Google Flights engine. Outputs results as a formatted table or structured JSON.

## Tech Stack

- Bun (runtime, test runner, package manager)
- TypeScript (no build step; Bun runs `.ts` directly)
- SerpApi Google Flights

## Architecture

Entrypoint is `bin/wayfinder` which calls `src/cli.ts`. The CLI parses args, resolves the API key, calls SerpApi, and renders output. `cli.ts` accepts dependency injection (`fetchImpl`, `output`, `env`) so tests run without network or filesystem access.
