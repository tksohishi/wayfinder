import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliError } from "./errors";
import { ExitCode } from "./types";

interface ConfigFile {
  serpApiKey?: unknown;
}

export function resolveApiKey(env: NodeJS.ProcessEnv = process.env, homeDir = os.homedir()): string {
  const envKey = env.SERPAPI_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }

  const configPath = path.join(homeDir, ".config", "wayfinder", "config.json");

  if (!existsSync(configPath)) {
    throw missingKeyError();
  }

  let parsed: ConfigFile;
  try {
    const raw = readFileSync(configPath, "utf8");
    parsed = JSON.parse(raw) as ConfigFile;
  } catch {
    throw new CliError(
      "Could not read ~/.config/wayfinder/config.json. Ensure it is valid JSON.",
      ExitCode.MissingApiKey,
    );
  }

  if (typeof parsed.serpApiKey !== "string" || parsed.serpApiKey.trim() === "") {
    throw missingKeyError();
  }

  return parsed.serpApiKey.trim();
}

function missingKeyError(): CliError {
  return new CliError(
    "Missing SerpApi key. Set SERPAPI_API_KEY or add ~/.config/wayfinder/config.json with {\"serpApiKey\":\"...\"}.",
    ExitCode.MissingApiKey,
  );
}
