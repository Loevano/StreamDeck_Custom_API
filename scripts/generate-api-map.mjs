import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DEFAULT_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_TIMEOUT_MS = 4000;

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.STREAMDECK_CUSTOM_API_BASE_URL ?? DEFAULT_BASE_URL,
    outPath: process.env.STREAMDECK_API_MAP_OUT ?? path.join(rootDir, "API_ROUTE_MAP.md")
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--base-url" && next) {
      args.baseUrl = next;
      i += 1;
      continue;
    }
    if (token === "--out" && next) {
      args.outPath = path.isAbsolute(next) ? next : path.join(rootDir, next);
      i += 1;
      continue;
    }
  }

  return args;
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref?.();
  return controller.signal;
}

function normalizeBaseUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/$/, "");
  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }

  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeButton(button, index) {
  const row = toNumber(button?.row ?? button?.y) ?? 0;
  const col = toNumber(button?.col ?? button?.column ?? button?.x) ?? index;

  const route = button?.route ?? button?.api ?? {};
  const method =
    asString(button?.method)?.toUpperCase() ??
    asString(route?.method)?.toUpperCase() ??
    "GET";

  const pathValue =
    asString(button?.path) ??
    asString(button?.endpoint) ??
    asString(route?.path) ??
    asString(route?.endpoint) ??
    asString(button?.url) ??
    asString(route?.url);

  const title =
    asString(button?.title) ??
    asString(button?.label) ??
    asString(button?.name) ??
    `Key ${row},${col}`;

  const notes =
    asString(button?.notes) ??
    asString(button?.description) ??
    asString(button?.system);

  return {
    row,
    col,
    title,
    method,
    path: pathValue,
    notes,
    kind: asString(button?.kind) ?? "action"
  };
}

function normalizeLayoutPayload(rawPayload) {
  const payload = rawPayload?.layout ?? rawPayload;

  if (Array.isArray(payload?.layouts) && payload.layouts.length > 0) {
    const pages = payload.layouts.map((entry, index) => {
      const id =
        asString(entry?.layoutId) ??
        asString(entry?.id) ??
        asString(entry?.pageId) ??
        `page-${index + 1}`;

      const title =
        asString(entry?.title) ??
        asString(entry?.name) ??
        id;

      const keys = asArray(entry?.buttons ?? entry?.keys ?? entry?.actions)
        .map((button, buttonIndex) => normalizeButton(button, buttonIndex))
        .sort((a, b) => (a.row - b.row) || (a.col - b.col));

      return {
        id,
        title,
        keys,
        stateEndpoint: `/api/hardware/streamdeck/layout/${encodeURIComponent(id)}/state`
      };
    });

    return {
      id: asString(payload?.id) ?? asString(payload?.showId) ?? "amadeus-layout",
      pages
    };
  }

  const canonicalPages = asArray(payload?.pages ?? payload?.screens);
  const pages = canonicalPages.length > 0
    ? canonicalPages.map((entry, index) => {
        const id = asString(entry?.id) ?? asString(entry?.pageId) ?? `page-${index + 1}`;
        const title = asString(entry?.title) ?? asString(entry?.name) ?? id;
        const keys = asArray(entry?.keys ?? entry?.buttons ?? entry?.actions)
          .map((button, buttonIndex) => normalizeButton(button, buttonIndex))
          .sort((a, b) => (a.row - b.row) || (a.col - b.col));
        return {
          id,
          title,
          keys,
          stateEndpoint: `/api/hardware/streamdeck/layout/${encodeURIComponent(id)}/state`
        };
      })
    : [
        {
          id: asString(payload?.id) ?? asString(payload?.layoutId) ?? "root",
          title: asString(payload?.title) ?? "Root",
          keys: asArray(payload?.keys ?? payload?.buttons ?? payload?.actions)
            .map((button, buttonIndex) => normalizeButton(button, buttonIndex))
            .sort((a, b) => (a.row - b.row) || (a.col - b.col)),
          stateEndpoint: `/api/hardware/streamdeck/layout/${encodeURIComponent(asString(payload?.id) ?? asString(payload?.layoutId) ?? "root")}/state`
        }
      ];

  return {
    id: asString(payload?.id) ?? "layout",
    pages
  };
}

function renderTableRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function markdownEscape(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildMarkdown({ baseUrl, layout }) {
  const generatedAt = new Date().toISOString();
  const totalRoutes = layout.pages.reduce(
    (sum, page) => sum + page.keys.filter((key) => key.path).length,
    0
  );

  const lines = [];
  lines.push("# API Route Map");
  lines.push("");
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Base URL: \`${baseUrl}\``);
  lines.push(`Layout ID: \`${layout.id}\``);
  lines.push(`Pages: **${layout.pages.length}**  Actionable routes: **${totalRoutes}**`);
  lines.push("");

  const endpointOwners = new Map();

  layout.pages.forEach((page) => {
    lines.push(`## ${page.title} (\`${page.id}\`)`);
    lines.push("");
    lines.push(`State endpoint: \`GET ${page.stateEndpoint}\``);
    lines.push("");
    lines.push(renderTableRow(["Key", "Title", "Method", "Path", "Purpose"]));
    lines.push(renderTableRow(["---", "---", "---", "---", "---"]));

    page.keys.forEach((key) => {
      const keyLabel = `R${key.row + 1}C${key.col + 1}`;
      const pathValue = key.path ?? "-";
      const methodValue = key.path ? key.method : "-";
      const purposeValue = key.notes ?? (key.path ? "Key action" : key.kind);

      lines.push(
        renderTableRow([
          markdownEscape(keyLabel),
          markdownEscape(key.title),
          markdownEscape(methodValue),
          markdownEscape(pathValue),
          markdownEscape(purposeValue)
        ])
      );

      if (key.path) {
        const endpointKey = `${methodValue} ${pathValue}`;
        const owners = endpointOwners.get(endpointKey) ?? [];
        owners.push(`${page.title} / ${keyLabel} (${key.title})`);
        endpointOwners.set(endpointKey, owners);
      }
    });

    lines.push("");
  });

  lines.push("## Endpoint Catalog");
  lines.push("");
  lines.push(renderTableRow(["Method", "Path", "Used By"]));
  lines.push(renderTableRow(["---", "---", "---"]));

  [...endpointOwners.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([endpoint, owners]) => {
      const firstSpace = endpoint.indexOf(" ");
      const method = endpoint.slice(0, firstSpace);
      const pathValue = endpoint.slice(firstSpace + 1);
      lines.push(
        renderTableRow([
          markdownEscape(method),
          markdownEscape(pathValue),
          markdownEscape(owners.join("; "))
        ])
      );
    });

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(args.baseUrl);

  const response = await fetch(`${baseUrl}/api/hardware/streamdeck/layout`, {
    method: "GET",
    signal: createTimeoutSignal(DEFAULT_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Layout request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  const layout = normalizeLayoutPayload(payload);
  const markdown = buildMarkdown({ baseUrl, layout });

  fs.writeFileSync(args.outPath, markdown, "utf8");
  console.log(`Wrote API route map: ${args.outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
