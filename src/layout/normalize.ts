import { LayoutDefinition, LayoutKey, LayoutPage, LayoutRuntimeState, KeyVisualState, RuntimeKeyState } from "../types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function extractLayoutCandidate(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw) && raw.length > 0) {
    const first = asRecord(raw[0]);
    if (first) {
      return first;
    }
  }

  const root = asRecord(raw);
  if (!root) {
    throw new Error("Layout payload is not an object");
  }

  const nestedLayout = asRecord(root.layout);
  if (nestedLayout) {
    return nestedLayout;
  }

  if (Array.isArray(root.layouts) && root.layouts.length > 0) {
    const first = asRecord(root.layouts[0]);
    if (first) {
      return first;
    }
  }

  return root;
}

function normalizeRoute(raw: unknown): LayoutKey["route"] {
  const route = asRecord(raw);
  if (route) {
    const methodCandidate = asString(route.method)?.toUpperCase();
    const method = methodCandidate === "POST" ? "POST" : "GET";
    const path = asString(route.path) ?? asString(route.url) ?? asString(route.endpoint);
    if (path) {
      return {
        method,
        path,
        body: route.body
      };
    }
  }

  const routePath = asString((raw as Record<string, unknown>)?.path);
  if (routePath) {
    return { method: "GET", path: routePath };
  }

  return undefined;
}

function detectKind(rawKey: Record<string, unknown>, targetPageId?: string, route?: LayoutKey["route"]): LayoutKey["kind"] {
  const kindCandidate = asString(rawKey.kind)?.toLowerCase() ?? asString(rawKey.type)?.toLowerCase();
  if (kindCandidate === "folder") {
    return "folder";
  }
  if (kindCandidate === "back") {
    return "back";
  }
  if (kindCandidate === "action") {
    return "action";
  }

  const actionCandidate = asString(rawKey.action)?.toLowerCase();
  if (actionCandidate === "back") {
    return "back";
  }

  if (targetPageId) {
    return "folder";
  }

  if (route) {
    return "action";
  }

  return "action";
}

function normalizeKey(
  raw: unknown,
  index: number,
  pageId: string,
  fallbackColumns: number
): LayoutKey | null {
  const key = asRecord(raw);
  if (!key) {
    return null;
  }

  const id =
    asString(key.id) ??
    asString(key.keyId) ??
    asString(key.uuid) ??
    `${pageId}-key-${index}`;

  const position = asRecord(key.position) ?? asRecord(key.coordinates);
  const slot = asNumber(key.slot) ?? asNumber(key.index);

  let row =
    asNumber(key.row) ??
    asNumber(key.y) ??
    (position ? asNumber(position.row) ?? asNumber(position.y) : undefined);

  let column =
    asNumber(key.column) ??
    asNumber(key.col) ??
    asNumber(key.x) ??
    (position ? asNumber(position.column) ?? asNumber(position.col) ?? asNumber(position.x) : undefined);

  if ((row === undefined || column === undefined) && slot !== undefined) {
    row = Math.floor(slot / fallbackColumns);
    column = slot % fallbackColumns;
  }

  if (row === undefined || column === undefined) {
    row = Math.floor(index / fallbackColumns);
    column = index % fallbackColumns;
  }

  const targetPageId =
    asString(key.targetPageId) ??
    asString(key.childPageId) ??
    asString(key.pageId) ??
    asString(asRecord(key.target)?.pageId);

  const route =
    normalizeRoute(key.route) ??
    normalizeRoute(key.api) ??
    normalizeRoute({
      method: key.method,
      path: key.path ?? key.endpoint ?? key.url,
      body: key.body
    });

  const normalized: LayoutKey = {
    id,
    row,
    column,
    title: asString(key.title) ?? asString(key.label) ?? asString(key.name),
    group: asString(key.group) ?? asString(key.groupId),
    kind: detectKind(key, targetPageId, route),
    route,
    targetPageId
  };

  if (normalized.kind === "action" && !normalized.route) {
    return null;
  }

  if (normalized.kind === "folder" && !normalized.targetPageId) {
    return null;
  }

  return normalized;
}

function normalizePage(raw: unknown, index: number, fallbackColumns: number): LayoutPage | null {
  const page = asRecord(raw);
  if (!page) {
    return null;
  }

  const pageId = asString(page.id) ?? asString(page.pageId) ?? `page-${index}`;

  const keysRaw =
    (Array.isArray(page.keys) ? page.keys : undefined) ??
    (Array.isArray(page.buttons) ? page.buttons : undefined) ??
    (Array.isArray(page.actions) ? page.actions : undefined) ??
    [];

  const keys: LayoutKey[] = [];
  keysRaw.forEach((item, keyIndex) => {
    const normalized = normalizeKey(item, keyIndex, pageId, fallbackColumns);
    if (normalized) {
      keys.push(normalized);
    }
  });

  return {
    id: pageId,
    title: asString(page.title) ?? asString(page.name),
    parentPageId: asString(page.parentPageId) ?? asString(page.parentId),
    keys
  };
}

function normalizeVisualState(value: unknown): KeyVisualState {
  const candidate = asString(value)?.toLowerCase();
  if (candidate === "active" || candidate === "inactive" || candidate === "mixed" || candidate === "disabled") {
    return candidate;
  }
  return "inactive";
}

function normalizeStateEntry(raw: unknown, keyIdFromMap?: string): RuntimeKeyState | null {
  const entry = asRecord(raw);
  if (!entry && keyIdFromMap === undefined) {
    return null;
  }

  const keyId =
    keyIdFromMap ??
    asString(entry?.keyId) ??
    asString(entry?.id) ??
    asString(entry?.uuid);

  if (!keyId) {
    return null;
  }

  const explicitDisabled = asBoolean(entry?.disabled);
  const explicitActive = asBoolean(entry?.active);

  let state = normalizeVisualState(entry?.state ?? entry?.status ?? entry?.mode);

  if (explicitDisabled === true) {
    state = "disabled";
  } else if (explicitActive === true) {
    state = "active";
  } else if (explicitActive === false && state === "active") {
    state = "inactive";
  }

  return {
    keyId,
    state,
    label: asString(entry?.label) ?? asString(entry?.title),
    color: asString(entry?.color) ?? asString(entry?.hex)
  };
}

export function normalizeLayoutResponse(raw: unknown): LayoutDefinition {
  const layout = extractLayoutCandidate(raw);

  const fallbackColumns = asNumber(layout.columns) ?? 5;

  const pagesRaw =
    (Array.isArray(layout.pages) ? layout.pages : undefined) ??
    (Array.isArray(layout.screens) ? layout.screens : undefined) ??
    [];

  const pages: Record<string, LayoutPage> = {};

  if (pagesRaw.length > 0) {
    pagesRaw.forEach((item, index) => {
      const normalized = normalizePage(item, index, fallbackColumns);
      if (normalized) {
        pages[normalized.id] = normalized;
      }
    });
  } else {
    const fallbackPage = normalizePage(
      {
        id: asString(layout.rootPageId) ?? "root",
        title: asString(layout.title) ?? "Root",
        keys:
          (Array.isArray(layout.keys) ? layout.keys : undefined) ??
          (Array.isArray(layout.buttons) ? layout.buttons : undefined) ??
          []
      },
      0,
      fallbackColumns
    );

    if (fallbackPage) {
      pages[fallbackPage.id] = fallbackPage;
    }
  }

  const pageIds = Object.keys(pages);
  if (pageIds.length === 0) {
    throw new Error("Layout response did not include any pages");
  }

  const rootPageId = asString(layout.rootPageId) ?? pageIds[0];

  if (!pages[rootPageId]) {
    pages[rootPageId] = {
      id: rootPageId,
      title: "Root",
      keys: []
    };
  }

  return {
    id: asString(layout.id) ?? "default-layout",
    title: asString(layout.title),
    rootPageId,
    pages
  };
}

export function normalizeStateResponse(raw: unknown): LayoutRuntimeState {
  const byKeyId: Record<string, RuntimeKeyState> = {};

  const root = asRecord(raw);

  const arrayEntries =
    (Array.isArray(root?.keys) ? root?.keys : undefined) ??
    (Array.isArray(root?.states) ? root?.states : undefined) ??
    (Array.isArray(raw) ? raw : undefined);

  if (arrayEntries) {
    arrayEntries.forEach((entry) => {
      const normalized = normalizeStateEntry(entry);
      if (normalized) {
        byKeyId[normalized.keyId] = normalized;
      }
    });
  }

  const mapCandidates = [
    asRecord(root?.byKeyId),
    asRecord(root?.keys),
    asRecord(root?.states)
  ];

  mapCandidates.forEach((candidate) => {
    if (!candidate) {
      return;
    }

    Object.entries(candidate).forEach(([keyId, value]) => {
      const normalized = normalizeStateEntry(value, keyId);
      if (normalized) {
        byKeyId[normalized.keyId] = normalized;
      }
    });
  });

  return { byKeyId };
}
