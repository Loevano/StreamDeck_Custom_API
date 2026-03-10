import { normalizeLayoutResponse, normalizeStateResponse } from "../layout/normalize";
import { LayoutDefinition, LayoutRuntimeState, PluginConfig, ApiRoute } from "../types";

function joinUrl(baseUrl: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref?.();
  return controller.signal;
}

async function parseJsonOrText(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export class CustomApiClient {
  constructor(private readonly getConfig: () => PluginConfig) {}

  async getLayout(): Promise<LayoutDefinition> {
    const config = this.getConfig();
    const response = await fetch(joinUrl(config.apiBaseUrl, "/api/hardware/streamdeck/layout"), {
      method: "GET",
      signal: createTimeoutSignal(config.requestTimeoutMs)
    });

    if (!response.ok) {
      throw new Error(`Layout request failed (${response.status} ${response.statusText})`);
    }

    const data = await parseJsonOrText(response);
    return normalizeLayoutResponse(data);
  }

  async getLayoutState(layoutId: string): Promise<LayoutRuntimeState> {
    const config = this.getConfig();
    const response = await fetch(
      joinUrl(config.apiBaseUrl, `/api/hardware/streamdeck/layout/${encodeURIComponent(layoutId)}/state`),
      {
        method: "GET",
        signal: createTimeoutSignal(config.requestTimeoutMs)
      }
    );

    if (!response.ok) {
      throw new Error(`State request failed (${response.status} ${response.statusText})`);
    }

    const data = await parseJsonOrText(response);
    return normalizeStateResponse(data, layoutId);
  }

  async invokeRoute(route: ApiRoute): Promise<unknown> {
    const config = this.getConfig();

    const response = await fetch(joinUrl(config.apiBaseUrl, route.path), {
      method: route.method,
      headers: route.method === "POST" ? { "content-type": "application/json" } : undefined,
      body: route.method === "POST" && route.body !== undefined ? JSON.stringify(route.body) : undefined,
      signal: createTimeoutSignal(config.requestTimeoutMs)
    });

    if (!response.ok) {
      const body = await parseJsonOrText(response);
      throw new Error(`Action request failed (${response.status} ${response.statusText}): ${JSON.stringify(body)}`);
    }

    return parseJsonOrText(response);
  }
}
