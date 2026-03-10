export type HttpMethod = "GET" | "POST";

export type KeyVisualState = "active" | "inactive" | "mixed" | "disabled";

export interface ApiRoute {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

export interface LayoutKey {
  id: string;
  row: number;
  column: number;
  title?: string;
  group?: string;
  kind: "action" | "folder" | "back";
  route?: ApiRoute;
  targetPageId?: string;
}

export interface LayoutPage {
  id: string;
  title?: string;
  parentPageId?: string;
  stateLayoutId?: string;
  keys: LayoutKey[];
}

export interface LayoutDefinition {
  id: string;
  title?: string;
  rootPageId: string;
  pages: Record<string, LayoutPage>;
}

export interface RuntimeKeyState {
  keyId: string;
  state: KeyVisualState;
  label?: string;
  color?: string;
}

export interface LayoutRuntimeState {
  byKeyId: Record<string, RuntimeKeyState>;
}

export interface PluginConfig {
  apiBaseUrl: string;
  layoutPollIntervalMs: number;
  statePollIntervalMs: number;
  requestTimeoutMs: number;
}

export interface KeyCoordinates {
  row: number;
  column: number;
}

export interface RegisteredKey {
  context: string;
  device: string;
  coordinates: KeyCoordinates;
}

export interface DeviceInfo {
  id: string;
  columns: number;
  rows: number;
}

export interface GlobalSettings {
  apiBaseUrl?: string;
  layoutPollIntervalMs?: number;
  statePollIntervalMs?: number;
  requestTimeoutMs?: number;
}

export interface StreamDeckIncomingMessage {
  event: string;
  context?: string;
  action?: string;
  device?: string;
  payload?: Record<string, unknown>;
}

export interface StreamDeckOutgoingMessage {
  event: string;
  uuid?: string;
  context?: string;
  payload?: Record<string, unknown>;
}
