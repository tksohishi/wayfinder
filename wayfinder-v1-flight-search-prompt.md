Build `wayfinder` v1 as a travel CLI focused only on flight search.

Goal:
Create a reliable command line tool that returns useful flight options quickly for personal trip planning.

What to build:
1. A `wayfinder` CLI command for one way flight search.
2. Required inputs: origin airport code, destination airport code, departure date.
3. Optional filters: airline code, max stops, max price, departure time window.
4. Output modes:
   1. Default human friendly table with key fields.
   2. `--json` mode for raw structured output.
5. Clear errors for missing API key, invalid input, and no results.

Data source:
Use SerpApi Google Flights endpoint for v1.

Config and secrets:
1. Read API key from environment first.
2. Fallback to config file under `~/.config/wayfinder/`.
3. Never print secrets.

Result quality:
1. Show enough fields for quick comparison:
   1. price
   2. airline
   3. departure and arrival times
   4. duration
   5. stops
2. Sort results by lowest price by default.

Out of scope for v1:
1. round trip and multi city
2. hotels and rental cars
3. booking flow and checkout links management
4. background watchers and alerts
5. account sync or cloud storage

Acceptance criteria:
1. A user can run one command and get comparable flight options.
2. A user can run the same query with `--json` and pipe it to `jq`.
3. Input validation catches obvious mistakes before API calls.
4. The command exits with non zero status on failure.

Deliverables:
1. runnable CLI command
2. short README section with install, setup, and 3 usage examples
3. basic tests for argument parsing and response shaping
