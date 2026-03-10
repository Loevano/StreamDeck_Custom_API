import { CustomApiClient } from "../api/custom-api-client";
import { mergeGlobalSettings } from "../config";
import { logger } from "../logger";
import { buildKeyImage } from "../streamdeck/key-image";
import {
  DeviceInfo,
  GlobalSettings,
  KeyVisualState,
  LayoutDefinition,
  LayoutKey,
  LayoutRuntimeState,
  PluginConfig,
  RegisteredKey,
  RuntimeKeyState,
  StreamDeckIncomingMessage
} from "../types";
import { NavigationStore } from "./navigation-store";

interface StreamDeckRenderer {
  setImage(context: string, image: string): void;
  setTitle(context: string, title: string): void;
  showOk(context: string): void;
  showAlert(context: string): void;
}

interface RenderOptions {
  title: string;
  subtitle?: string;
  state: KeyVisualState;
  color?: string;
}

export class RuntimeController {
  private config: PluginConfig;
  private layout: LayoutDefinition | null = null;
  private layoutState: LayoutRuntimeState = { byKeyId: {} };
  private readonly apiClient: CustomApiClient;
  private readonly navigation = new NavigationStore();
  private readonly registeredKeys = new Map<string, RegisteredKey>();
  private readonly devices = new Map<string, DeviceInfo>();
  private layoutPollTimer: NodeJS.Timeout | null = null;
  private statePollTimer: NodeJS.Timeout | null = null;
  private offlineReason: string | null = null;
  private refreshLayoutInFlight = false;
  private refreshStateInFlight = false;
  private lastLayoutFingerprint = "";

  constructor(initialConfig: PluginConfig, private readonly renderer: StreamDeckRenderer) {
    this.config = initialConfig;
    this.apiClient = new CustomApiClient(() => this.config);
  }

  async start(): Promise<void> {
    await this.refreshLayout({ forceRender: true });
    await this.refreshState({ forceRender: true });
    this.startPolling();
  }

  stop(): void {
    if (this.layoutPollTimer) {
      clearInterval(this.layoutPollTimer);
      this.layoutPollTimer = null;
    }

    if (this.statePollTimer) {
      clearInterval(this.statePollTimer);
      this.statePollTimer = null;
    }
  }

  updateGlobalSettings(settings: GlobalSettings): void {
    const previous = this.config;
    this.config = mergeGlobalSettings(this.config, settings);

    const needsRestart =
      previous.layoutPollIntervalMs !== this.config.layoutPollIntervalMs ||
      previous.statePollIntervalMs !== this.config.statePollIntervalMs;

    if (needsRestart) {
      this.startPolling();
    }

    logger.info("Applied global settings", this.config);

    void this.refreshLayout({ forceRender: true });
    void this.refreshState({ forceRender: true });
  }

  async handleMessage(message: StreamDeckIncomingMessage): Promise<void> {
    switch (message.event) {
      case "deviceDidConnect":
        this.onDeviceConnected(message);
        break;
      case "deviceDidDisconnect":
        this.onDeviceDisconnected(message);
        break;
      case "willAppear":
        this.onWillAppear(message);
        break;
      case "willDisappear":
        this.onWillDisappear(message);
        break;
      case "keyDown":
        await this.onKeyDown(message);
        break;
      case "didReceiveGlobalSettings":
        this.onDidReceiveGlobalSettings(message);
        break;
      default:
        break;
    }
  }

  private startPolling(): void {
    if (this.layoutPollTimer) {
      clearInterval(this.layoutPollTimer);
    }

    if (this.statePollTimer) {
      clearInterval(this.statePollTimer);
    }

    this.layoutPollTimer = setInterval(() => {
      void this.refreshLayout({ forceRender: false });
    }, this.config.layoutPollIntervalMs);

    this.statePollTimer = setInterval(() => {
      void this.refreshState({ forceRender: false });
    }, this.config.statePollIntervalMs);
  }

  private onDeviceConnected(message: StreamDeckIncomingMessage): void {
    const payload: Record<string, unknown> = message.payload ?? {};
    const size = (payload.size as Record<string, unknown> | undefined) ?? {};

    const deviceId = typeof message.device === "string" ? message.device : undefined;
    if (!deviceId) {
      return;
    }

    const columns = Number(size.columns ?? 5);
    const rows = Number(size.rows ?? 3);

    this.devices.set(deviceId, {
      id: deviceId,
      columns: Number.isFinite(columns) ? columns : 5,
      rows: Number.isFinite(rows) ? rows : 3
    });

    if (this.layout) {
      this.navigation.ensureRoot(deviceId, this.layout.rootPageId);
      this.renderDevice(deviceId);
    }
  }

  private onDeviceDisconnected(message: StreamDeckIncomingMessage): void {
    const deviceId = typeof message.device === "string" ? message.device : undefined;
    if (!deviceId) {
      return;
    }

    this.devices.delete(deviceId);
    this.navigation.reset(deviceId);

    const contextsToDelete: string[] = [];
    this.registeredKeys.forEach((entry, context) => {
      if (entry.device === deviceId) {
        contextsToDelete.push(context);
      }
    });

    contextsToDelete.forEach((context) => this.registeredKeys.delete(context));
  }

  private onWillAppear(message: StreamDeckIncomingMessage): void {
    if (!message.context || !message.device) {
      return;
    }

    const payload: Record<string, unknown> = message.payload ?? {};
    const coordinates = payload.coordinates as Record<string, unknown> | undefined;

    const row = Number(coordinates?.row ?? 0);
    const column = Number(coordinates?.column ?? 0);

    this.registeredKeys.set(message.context, {
      context: message.context,
      device: message.device,
      coordinates: {
        row: Number.isFinite(row) ? row : 0,
        column: Number.isFinite(column) ? column : 0
      }
    });

    if (this.layout) {
      this.navigation.ensureRoot(message.device, this.layout.rootPageId);
    }

    this.renderContext(message.context);
  }

  private onWillDisappear(message: StreamDeckIncomingMessage): void {
    if (!message.context) {
      return;
    }

    this.registeredKeys.delete(message.context);
  }

  private onDidReceiveGlobalSettings(message: StreamDeckIncomingMessage): void {
    const payload: Record<string, unknown> = message.payload ?? {};
    const settings = payload.settings as GlobalSettings | undefined;

    if (!settings) {
      return;
    }

    this.updateGlobalSettings(settings);
  }

  private async onKeyDown(message: StreamDeckIncomingMessage): Promise<void> {
    if (!message.context) {
      return;
    }

    if (!this.layout) {
      this.renderer.showAlert(message.context);
      return;
    }

    const registration = this.registeredKeys.get(message.context);
    if (!registration) {
      return;
    }

    const keyDefinition = this.resolveKeyForRegisteredContext(registration);
    if (!keyDefinition) {
      this.renderer.showAlert(message.context);
      return;
    }

    const keyState = this.layoutState.byKeyId[keyDefinition.id];
    if (keyState?.state === "disabled") {
      this.renderer.showAlert(message.context);
      return;
    }

    if (keyDefinition.kind === "back") {
      this.navigation.goBack(registration.device);
      this.renderDevice(registration.device);
      this.renderer.showOk(message.context);
      await this.refreshState({ forceRender: true });
      return;
    }

    if (keyDefinition.kind === "folder" && keyDefinition.targetPageId) {
      this.navigation.enterPage(registration.device, keyDefinition.targetPageId, this.layout.rootPageId);
      this.renderDevice(registration.device);
      this.renderer.showOk(message.context);
      await this.refreshState({ forceRender: true });
      return;
    }

    if (!keyDefinition.route) {
      this.renderer.showAlert(message.context);
      return;
    }

    try {
      logger.info("Invoking API route from key press", {
        keyId: keyDefinition.id,
        keyTitle: keyDefinition.title,
        method: keyDefinition.route.method,
        path: keyDefinition.route.path
      });
      await this.apiClient.invokeRoute(keyDefinition.route);
      this.renderer.showOk(message.context);

      await this.refreshLayout({ forceRender: false });
      await this.refreshState({ forceRender: true });
    } catch (error) {
      logger.error("Action call failed", {
        keyId: keyDefinition.id,
        route: keyDefinition.route,
        error
      });
      this.renderer.showAlert(message.context);
    }
  }

  private async refreshLayout(options: { forceRender: boolean }): Promise<void> {
    if (this.refreshLayoutInFlight) {
      return;
    }

    this.refreshLayoutInFlight = true;
    try {
      const layout = await this.apiClient.getLayout();
      const fingerprint = JSON.stringify(layout);
      const changed = this.lastLayoutFingerprint !== fingerprint;

      this.layout = layout;
      this.lastLayoutFingerprint = fingerprint;
      this.clearOffline();

      this.devices.forEach((_, deviceId) => {
        this.navigation.ensureRoot(deviceId, layout.rootPageId);
        const current = this.navigation.getCurrentPageId(deviceId, layout.rootPageId);
        if (!layout.pages[current]) {
          this.navigation.reset(deviceId);
          this.navigation.ensureRoot(deviceId, layout.rootPageId);
        }
      });

      if (changed || options.forceRender) {
        this.renderAll();
      }
    } catch (error) {
      this.markOffline(error instanceof Error ? error.message : String(error));
      this.renderAll();
    } finally {
      this.refreshLayoutInFlight = false;
    }
  }

  private async refreshState(options: { forceRender: boolean }): Promise<void> {
    if (this.refreshStateInFlight || !this.layout) {
      return;
    }

    this.refreshStateInFlight = true;
    try {
      const stateLayoutIds = this.getStateLayoutIds();
      if (stateLayoutIds.length === 0) {
        this.clearOffline();
        this.renderAll();
        return;
      }

      const mergedByKeyId: LayoutRuntimeState["byKeyId"] = {};
      let successCount = 0;
      let lastError: unknown = null;

      for (const stateLayoutId of stateLayoutIds) {
        try {
          const state = await this.apiClient.getLayoutState(stateLayoutId);
          Object.assign(mergedByKeyId, state.byKeyId);
          successCount += 1;
        } catch (error) {
          lastError = error;
          logger.warn("State request failed for layout page", {
            stateLayoutId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (successCount === 0) {
        if (lastError instanceof Error) {
          throw lastError;
        }
        throw new Error("No state endpoints were reachable");
      }

      this.layoutState = { byKeyId: mergedByKeyId };
      this.clearOffline();
      this.renderAll();
    } catch (error) {
      this.markOffline(error instanceof Error ? error.message : String(error));
      this.renderAll();
    } finally {
      this.refreshStateInFlight = false;
    }
  }

  private getStateLayoutIds(): string[] {
    if (!this.layout) {
      return [];
    }

    const ids = new Set<string>();
    this.devices.forEach((_, deviceId) => {
      const currentPageId = this.navigation.getCurrentPageId(deviceId, this.layout!.rootPageId);
      const page = this.layout!.pages[currentPageId] ?? this.layout!.pages[this.layout!.rootPageId];
      if (page?.stateLayoutId) {
        ids.add(page.stateLayoutId);
      }
    });

    if (ids.size === 0 && this.devices.size === 0) {
      const firstPageWithState = Object.values(this.layout.pages).find((page) => page.stateLayoutId);
      if (firstPageWithState?.stateLayoutId) {
        ids.add(firstPageWithState.stateLayoutId);
      }
    }

    return [...ids];
  }

  private renderAll(): void {
    this.registeredKeys.forEach((_, context) => this.renderContext(context));
  }

  private renderDevice(deviceId: string): void {
    this.registeredKeys.forEach((entry, context) => {
      if (entry.device === deviceId) {
        this.renderContext(context);
      }
    });
  }

  private renderContext(context: string): void {
    const registration = this.registeredKeys.get(context);
    if (!registration) {
      return;
    }

    const render = this.buildRenderOptions(registration);
    this.renderer.setTitle(context, render.title);
    this.renderer.setImage(
      context,
      buildKeyImage({
        title: render.title,
        subtitle: render.subtitle,
        state: render.state,
        color: render.color
      })
    );
  }

  private buildRenderOptions(registration: RegisteredKey): RenderOptions {
    if (this.offlineReason) {
      return {
        title: "API OFFLINE",
        subtitle: this.offlineReason.slice(0, 26),
        state: "disabled",
        color: "#8B2B2B"
      };
    }

    if (!this.layout) {
      return {
        title: "Loading",
        subtitle: "Waiting for layout",
        state: "inactive",
        color: "#1A4A7A"
      };
    }

    const key = this.resolveKeyForRegisteredContext(registration);
    if (!key) {
      return {
        title: "",
        subtitle: "",
        state: "inactive",
        color: "#111111"
      };
    }

    const runtimeState = this.layoutState.byKeyId[key.id];

    let title = key.title ?? this.defaultTitleForKey(key);
    let subtitle = this.formatStatusText(runtimeState) ?? key.group;
    let state: KeyVisualState = runtimeState?.state ?? "inactive";

    if (key.kind === "folder") {
      subtitle = "Open";
      state = runtimeState?.state ?? "inactive";
    }

    if (key.kind === "back") {
      title = key.title ?? "Back";
      subtitle = "Previous page";
      state = runtimeState?.state ?? "inactive";
    }

    return {
      title,
      subtitle,
      state,
      color: runtimeState?.color
    };
  }

  private formatStatusText(runtimeState?: RuntimeKeyState): string | undefined {
    if (!runtimeState) {
      return undefined;
    }

    const stateWord = runtimeState.state.toUpperCase();
    const label = runtimeState.label?.trim();
    if (!label || label === "-") {
      return stateWord;
    }

    if (label.toUpperCase() === stateWord) {
      return label;
    }

    return `${label} ${stateWord}`;
  }

  private defaultTitleForKey(key: LayoutKey): string {
    if (key.kind === "folder") {
      return "Folder";
    }
    if (key.kind === "back") {
      return "Back";
    }
    return "Action";
  }

  private resolveKeyForRegisteredContext(registration: RegisteredKey): LayoutKey | undefined {
    if (!this.layout) {
      return undefined;
    }

    const currentPageId = this.navigation.getCurrentPageId(registration.device, this.layout.rootPageId);
    const page = this.layout.pages[currentPageId] ?? this.layout.pages[this.layout.rootPageId];
    if (!page) {
      return undefined;
    }

    return page.keys.find(
      (key) =>
        key.row === registration.coordinates.row && key.column === registration.coordinates.column
    );
  }

  private markOffline(reason: string): void {
    if (this.offlineReason !== reason) {
      logger.warn("Custom API appears offline", reason);
    }
    this.offlineReason = reason;
  }

  private clearOffline(): void {
    if (this.offlineReason) {
      logger.info("Custom API is reachable again");
    }
    this.offlineReason = null;
  }
}
