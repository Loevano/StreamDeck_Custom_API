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

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9/_-]+/g, "-");
}

function buildStableKeyId(
  pageId: string,
  row: number,
  column: number,
  routePath?: string,
  title?: string,
  index = 0
): string {
  const basis = routePath ?? title ?? `idx-${index}`;
  return `${pageId}::${row}:${column}::${normalizeToken(basis)}`;
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

  const title = asString(key.title) ?? asString(key.label) ?? asString(key.name);

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

  const explicitId =
    asString(key.id) ??
    asString(key.keyId) ??
    asString(key.uuid) ??
    asString(key.buttonId);

  const id =
    explicitId ??
    buildStableKeyId(pageId, row, column, route?.path, title, index);

  const normalized: LayoutKey = {
    id,
    row,
    column,
    title,
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

  const pageId =
    asString(page.id) ??
    asString(page.pageId) ??
    asString(page.layoutId) ??
    `page-${index}`;

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
    stateLayoutId: asString(page.stateLayoutId) ?? asString(page.layoutId),
    keys
  };
}

function slotId(row: number, column: number): string {
  return `${row}:${column}`;
}

function findFreeSlot(
  used: Set<string>,
  rows: number,
  columns: number,
  preferredRow: number,
  preferredColumn: number
): { row: number; column: number } | null {
  if (!used.has(slotId(preferredRow, preferredColumn))) {
    return { row: preferredRow, column: preferredColumn };
  }

  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      if (!used.has(slotId(row, column))) {
        return { row, column };
      }
    }
  }

  return null;
}

function ensureBackKey(page: LayoutPage, rows: number, columns: number): void {
  if (page.keys.some((key) => key.kind === "back")) {
    return;
  }

  const used = new Set(page.keys.map((key) => slotId(key.row, key.column)));
  const slot = findFreeSlot(used, rows, columns, rows - 1, columns - 1);
  if (!slot) {
    return;
  }

  page.keys.push({
    id: buildStableKeyId(page.id, slot.row, slot.column, "__back__", "Back"),
    row: slot.row,
    column: slot.column,
    title: "Back",
    kind: "back"
  });
}

function ensureFolderKey(
  parent: LayoutPage,
  child: LayoutPage,
  rows: number,
  columns: number,
  preferredIndex: number
): void {
  if (parent.keys.some((key) => key.kind === "folder" && key.targetPageId === child.id)) {
    return;
  }

  const used = new Set(parent.keys.map((key) => slotId(key.row, key.column)));
  const preferredRow = Math.floor(preferredIndex / columns);
  const preferredColumn = preferredIndex % columns;

  let slot: { row: number; column: number } | null = null;
  if (preferredRow < rows) {
    slot = findFreeSlot(used, rows, columns, preferredRow, preferredColumn);
  }

  if (!slot) {
    slot = findFreeSlot(used, rows, columns, rows - 1, Math.max(0, columns - 2));
  }

  if (!slot) {
    return;
  }

  parent.keys.push({
    id: buildStableKeyId(parent.id, slot.row, slot.column, `__folder__${child.id}`, child.title, preferredIndex),
    row: slot.row,
    column: slot.column,
    title: child.title ?? child.id,
    kind: "folder",
    targetPageId: child.id
  });
}

function pageText(page: LayoutPage): string {
  return `${page.id} ${page.title ?? ""}`.toLowerCase();
}

function pageHasTokens(page: LayoutPage, requiredTokens: string[]): boolean {
  const text = pageText(page);
  return requiredTokens.every((token) => text.includes(token));
}

function splitModulatorsOutOfConfig(pages: LayoutPage[]): LayoutPage[] {
  const hasExplicitModulatorsPage = pages.some(
    (page) => pageHasTokens(page, ["modulator"]) || pageHasTokens(page, ["lfo"])
  );

  if (hasExplicitModulatorsPage) {
    return pages;
  }

  const updated: LayoutPage[] = [];

  pages.forEach((page) => {
    updated.push(page);

    const isConfigPage = pageHasTokens(page, ["config"]) || pageHasTokens(page, ["setting"]);
    if (!isConfigPage) {
      return;
    }

    const lfoKeys = page.keys.filter((key) => {
      const path = key.route?.path ?? "";
      return /\/lfos?(\/|$)/i.test(path);
    });

    if (lfoKeys.length === 0) {
      return;
    }

    page.keys = page.keys.filter((key) => !lfoKeys.includes(key));

    updated.push({
      id: `${page.id}-modulators`,
      title: "Modulators",
      parentPageId: page.id,
      stateLayoutId: page.stateLayoutId ?? page.id,
      keys: lfoKeys
    });
  });

  return updated;
}

function splitGroupHideOutOfEnablePages(pages: LayoutPage[]): LayoutPage[] {
  const hasExplicitGroupHidePage = pages.some((page) => pageHasTokens(page, ["group", "hide"]));
  if (hasExplicitGroupHidePage) {
    return pages;
  }

  const updated: LayoutPage[] = [];

  pages.forEach((page) => {
    updated.push(page);

    const isGroupPage = pageHasTokens(page, ["group"]);
    if (!isGroupPage) {
      return;
    }

    const hideKeys = page.keys.filter((key) => {
      const path = key.route?.path ?? "";
      return /\/group\/[^/]+\/hide\/(on|off|toggle)/i.test(path) || /\/groups\/hide\/(on|off|toggle)/i.test(path);
    });

    const enableKeys = page.keys.filter((key) => {
      const path = key.route?.path ?? "";
      return /\/group\/[^/]+\/enabled\/(on|off|toggle)/i.test(path) || /\/groups\/enabled\/(on|off|toggle)/i.test(path);
    });

    if (hideKeys.length === 0 || enableKeys.length === 0) {
      return;
    }

    page.keys = page.keys.filter((key) => !hideKeys.includes(key));

    const hiddenPageTitle = page.title
      ? page.title.replace(/enable/gi, "Hide").replace(/enabled/gi, "Hide")
      : "Group Hide";

    updated.push({
      id: `${page.id}-hide`,
      title: hiddenPageTitle,
      parentPageId: page.id,
      stateLayoutId: page.stateLayoutId ?? page.id,
      keys: hideKeys
    });
  });

  return updated;
}

function applySubpageHints(pages: LayoutPage[]): void {
  const findPage = (requiredTokens: string[]): LayoutPage | undefined =>
    pages.find((page) => pageHasTokens(page, requiredTokens));

  const objSelect = findPage(["obj", "select"]);
  const objHide = findPage(["obj", "hide"]);
  if (objSelect && objHide && !objHide.parentPageId && objSelect.id !== objHide.id) {
    objHide.parentPageId = objSelect.id;
  }

  const groupEnable = findPage(["group", "enable"]);
  const groupHide = findPage(["group", "hide"]);
  if (groupEnable && groupHide && !groupHide.parentPageId && groupEnable.id !== groupHide.id) {
    groupHide.parentPageId = groupEnable.id;
  }

  const settings = findPage(["config"]) ?? findPage(["setting"]);
  const modulators = findPage(["modulator"]) ?? findPage(["lfo"]);
  if (settings && modulators && !modulators.parentPageId && settings.id !== modulators.id) {
    modulators.parentPageId = settings.id;
  }
}

function applyNavigationHierarchy(
  pages: Record<string, LayoutPage>,
  rootPageId: string,
  rootTitle: string,
  rows: number,
  columns: number,
  orderByPageId: Map<string, number>
): void {
  if (!pages[rootPageId]) {
    pages[rootPageId] = {
      id: rootPageId,
      title: rootTitle,
      keys: []
    };
  }

  const childrenByParent = new Map<string, string[]>();

  Object.values(pages).forEach((page) => {
    if (page.id === rootPageId) {
      return;
    }

    const requestedParentId = page.parentPageId;
    const parentId =
      requestedParentId && requestedParentId !== page.id && pages[requestedParentId]
        ? requestedParentId
        : rootPageId;

    page.parentPageId = parentId;
    ensureBackKey(page, rows, columns);

    const children = childrenByParent.get(parentId) ?? [];
    children.push(page.id);
    childrenByParent.set(parentId, children);
  });

  childrenByParent.forEach((childPageIds, parentId) => {
    const parent = pages[parentId];
    if (!parent) {
      return;
    }

    childPageIds
      .sort((leftId, rightId) => (orderByPageId.get(leftId) ?? 0) - (orderByPageId.get(rightId) ?? 0))
      .forEach((childPageId, index) => {
        const child = pages[childPageId];
        if (!child) {
          return;
        }
        ensureFolderKey(parent, child, rows, columns, index);
      });
  });
}

function normalizeLayoutsArrayRoot(root: Record<string, unknown>): LayoutDefinition {
  const layouts = Array.isArray(root.layouts) ? root.layouts : [];
  const device = asRecord(root.device);

  const columns = asNumber(device?.columns) ?? asNumber(root.columns) ?? 8;
  const rows = asNumber(device?.rows) ?? asNumber(root.rows) ?? 4;

  const rootPageId = asString(root.rootPageId) ?? "root";
  const orderedPages: LayoutPage[] = [];
  const orderByPageId = new Map<string, number>();

  let firstPageId: string | undefined;

  layouts.forEach((item, index) => {
    const page = normalizePage(item, index, columns);
    if (!page) {
      return;
    }

    if (!firstPageId) {
      firstPageId = page.id;
    }

    page.stateLayoutId = page.stateLayoutId ?? page.id;
    orderedPages.push(page);
  });

  if (orderedPages.length === 0) {
    throw new Error("Layout response did not include usable layouts");
  }

  const pagesToRender = splitModulatorsOutOfConfig(splitGroupHideOutOfEnablePages(orderedPages));
  applySubpageHints(pagesToRender);

  const pages: Record<string, LayoutPage> = {};
  pagesToRender.forEach((page, index) => {
    pages[page.id] = page;
    orderByPageId.set(page.id, index);
  });

  applyNavigationHierarchy(
    pages,
    rootPageId,
    asString(root.title) ?? "Layouts",
    rows,
    columns,
    orderByPageId
  );

  return {
    id: asString(root.id) ?? asString(root.showId) ?? "streamdeck-layouts",
    title: asString(root.title),
    rootPageId: pages[rootPageId] ? rootPageId : (firstPageId as string),
    pages
  };
}

function normalizeSingleLayout(raw: unknown): LayoutDefinition {
  const layout = extractLayoutCandidate(raw);
  const device = asRecord(layout.device);

  const fallbackColumns = asNumber(layout.columns) ?? asNumber(device?.columns) ?? 5;
  const fallbackRows = asNumber(layout.rows) ?? asNumber(device?.rows) ?? 3;

  const pagesRaw =
    (Array.isArray(layout.pages) ? layout.pages : undefined) ??
    (Array.isArray(layout.screens) ? layout.screens : undefined) ??
    [];

  const orderedPages: LayoutPage[] = [];
  const orderByPageId = new Map<string, number>();

  if (pagesRaw.length > 0) {
    pagesRaw.forEach((item, index) => {
      const normalized = normalizePage(item, index, fallbackColumns);
      if (normalized) {
        orderedPages.push(normalized);
      }
    });
  } else {
    const fallbackPage = normalizePage(
      {
        ...layout,
        id: asString(layout.id) ?? asString(layout.layoutId) ?? asString(layout.rootPageId) ?? "root",
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
      orderedPages.push(fallbackPage);
    }
  }

  const pagesToRender = splitModulatorsOutOfConfig(splitGroupHideOutOfEnablePages(orderedPages));
  applySubpageHints(pagesToRender);

  const pages: Record<string, LayoutPage> = {};
  pagesToRender.forEach((page, index) => {
    pages[page.id] = page;
    orderByPageId.set(page.id, index);
  });

  const pageIds = Object.keys(pages);
  if (pageIds.length === 0) {
    throw new Error("Layout response did not include any pages");
  }

  const rootPageId =
    asString(layout.rootPageId) ??
    asString(layout.layoutId) ??
    pageIds[0];

  if (!pages[rootPageId]) {
    pages[rootPageId] = {
      id: rootPageId,
      title: "Root",
      keys: []
    };
  }

  const layoutId =
    asString(layout.id) ??
    asString(layout.layoutId) ??
    rootPageId;

  Object.values(pages).forEach((page) => {
    if (!page.stateLayoutId) {
      page.stateLayoutId = layoutId;
    }
  });

  applyNavigationHierarchy(
    pages,
    rootPageId,
    asString(layout.title) ?? "Root",
    fallbackRows,
    fallbackColumns,
    orderByPageId
  );

  return {
    id: layoutId,
    title: asString(layout.title),
    rootPageId,
    pages
  };
}

function normalizeVisualState(value: unknown): KeyVisualState {
  const candidate = asString(value)?.toLowerCase();
  if (candidate === "active" || candidate === "inactive" || candidate === "mixed" || candidate === "disabled") {
    return candidate;
  }
  return "inactive";
}

function normalizeStateEntry(raw: unknown, keyIdFromMap?: string, pageIdHint?: string): RuntimeKeyState | null {
  const entry = asRecord(raw);
  if (!entry && keyIdFromMap === undefined) {
    return null;
  }

  const nestedState = asRecord(entry?.state);
  const position = asRecord(entry?.position) ?? asRecord(entry?.coordinates);

  const row =
    asNumber(entry?.row) ??
    asNumber(entry?.y) ??
    (position ? asNumber(position.row) ?? asNumber(position.y) : undefined);

  const column =
    asNumber(entry?.column) ??
    asNumber(entry?.col) ??
    asNumber(entry?.x) ??
    (position ? asNumber(position.column) ?? asNumber(position.col) ?? asNumber(position.x) : undefined);

  const routePath = asString(entry?.path) ?? asString(entry?.url);
  const fallbackTitle = asString(entry?.title) ?? asString(entry?.label);

  let keyId =
    keyIdFromMap ??
    asString(entry?.keyId) ??
    asString(entry?.id) ??
    asString(entry?.uuid) ??
    asString(nestedState?.keyId);

  if (!keyId && pageIdHint !== undefined && row !== undefined && column !== undefined) {
    keyId = buildStableKeyId(pageIdHint, row, column, routePath, fallbackTitle);
  }

  if (!keyId) {
    return null;
  }

  const explicitDisabled = asBoolean(nestedState?.disabled ?? entry?.disabled);
  const explicitActive = asBoolean(nestedState?.active ?? entry?.active);

  let state = normalizeVisualState(nestedState?.state ?? entry?.state ?? entry?.status ?? entry?.mode);

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
    label:
      asString(nestedState?.label) ??
      asString(entry?.label) ??
      asString(entry?.title),
    color:
      asString(nestedState?.color) ??
      asString(entry?.color) ??
      asString(nestedState?.hex) ??
      asString(entry?.hex)
  };
}

export function normalizeLayoutResponse(raw: unknown): LayoutDefinition {
  const root = asRecord(raw);
  if (root && Array.isArray(root.layouts) && root.layouts.length > 0) {
    return normalizeLayoutsArrayRoot(root);
  }

  return normalizeSingleLayout(raw);
}

export function normalizeStateResponse(raw: unknown, pageIdHint?: string): LayoutRuntimeState {
  const byKeyId: Record<string, RuntimeKeyState> = {};

  const root = asRecord(raw);

  const arrayEntries =
    (Array.isArray(root?.keys) ? root.keys : undefined) ??
    (Array.isArray(root?.states) ? root.states : undefined) ??
    (Array.isArray(root?.buttons) ? root.buttons : undefined) ??
    (Array.isArray(raw) ? raw : undefined);

  if (arrayEntries) {
    arrayEntries.forEach((entry) => {
      const normalized = normalizeStateEntry(entry, undefined, pageIdHint);
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
      const normalized = normalizeStateEntry(value, keyId, pageIdHint);
      if (normalized) {
        byKeyId[normalized.keyId] = normalized;
      }
    });
  });

  return { byKeyId };
}
