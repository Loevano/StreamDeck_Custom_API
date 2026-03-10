import { GlobalSettings, PluginConfig } from "./types";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_LAYOUT_POLL_MS = 5000;
const DEFAULT_STATE_POLL_MS = 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 2500;

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeBaseUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const trimmed = value.trim().replace(/\/$/, "");
  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function getInitialConfig(): PluginConfig {
  return {
    apiBaseUrl: normalizeBaseUrl(process.env.STREAMDECK_CUSTOM_API_BASE_URL, DEFAULT_API_BASE_URL),
    layoutPollIntervalMs: parseNumber(process.env.STREAMDECK_LAYOUT_POLL_MS, DEFAULT_LAYOUT_POLL_MS),
    statePollIntervalMs: parseNumber(process.env.STREAMDECK_STATE_POLL_MS, DEFAULT_STATE_POLL_MS),
    requestTimeoutMs: parseNumber(process.env.STREAMDECK_API_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS)
  };
}

export function mergeGlobalSettings(config: PluginConfig, settings: GlobalSettings): PluginConfig {
  return {
    apiBaseUrl: normalizeBaseUrl(settings.apiBaseUrl, config.apiBaseUrl),
    layoutPollIntervalMs: parseNumber(settings.layoutPollIntervalMs, config.layoutPollIntervalMs),
    statePollIntervalMs: parseNumber(settings.statePollIntervalMs, config.statePollIntervalMs),
    requestTimeoutMs: parseNumber(settings.requestTimeoutMs, config.requestTimeoutMs)
  };
}
