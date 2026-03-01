import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

  const configKey = readConfigApiKey(homeDir);
  if (!configKey) {
    throw missingKeyError();
  }

  return configKey;
}

export function readConfigApiKey(homeDir = os.homedir()): string | undefined {
  const configPath = getConfigPath(homeDir);
  if (!existsSync(configPath)) {
    return undefined;
  }

  let parsed: ConfigFile;
  try {
    const raw = readFileSync(configPath, "utf8");
    parsed = JSON.parse(raw) as ConfigFile;
  } catch {
    throw new CliError(
      "Could not read ~/.config/wayfinder/config.json. Ensure it is valid JSON or rerun `wayfinder setup`.",
      ExitCode.MissingApiKey,
    );
  }

  if (typeof parsed.serpApiKey !== "string") {
    return undefined;
  }

  const key = parsed.serpApiKey.trim();
  return key.length > 0 ? key : undefined;
}

export function writeConfigApiKey(apiKey: string, homeDir = os.homedir()): void {
  const configPath = getConfigPath(homeDir);
  const configDir = path.dirname(configPath);
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    configPath,
    `${JSON.stringify(
      {
        serpApiKey: apiKey,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export function getConfigPath(homeDir = os.homedir()): string {
  return path.join(homeDir, ".config", "wayfinder", "config.json");
}

function missingKeyError(): CliError {
  return new CliError(
    [
      "Missing SerpApi API key.",
      "Wayfinder needs a SerpApi key to fetch live flight and hotel results.",
      "SerpApi is the API provider used for Google Flights and Google Hotels data.",
      "Get a key at: https://serpapi.com/manage-api-key",
      "Then run: wayfinder setup",
    ].join("\n"),
    ExitCode.MissingApiKey,
  );
}
