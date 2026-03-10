(function () {
  const DEFAULT_BASE_URL = "http://127.0.0.1:8787";
  const REFRESH_INTERVAL_MS = 5000;

  const apiBaseUrlInput = document.getElementById("apiBaseUrl");
  const saveSettingsButton = document.getElementById("saveSettings");
  const refreshConfigButton = document.getElementById("refreshConfig");
  const configStatus = document.getElementById("configStatus");
  const summary = document.getElementById("summary");
  const pagesBody = document.getElementById("pagesBody");

  const searchParams = new URLSearchParams(window.location.search);
  const socketPort = Number(searchParams.get("port"));
  const registerEvent = searchParams.get("registerEvent") || "registerPropertyInspector";
  const propertyInspectorUUID =
    searchParams.get("propertyInspectorUUID") || searchParams.get("uuid") || "";
  const pluginUUID = searchParams.get("pluginUUID") || "";

  const state = {
    socket: null,
    settings: {
      apiBaseUrl: DEFAULT_BASE_URL,
      layoutPollIntervalMs: 5000,
      statePollIntervalMs: 1000,
      requestTimeoutMs: 2500
    },
    refreshTimer: null
  };

  function normalizeBaseUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return DEFAULT_BASE_URL;
    }
    return raw.replace(/\/+$/, "");
  }

  function setStatus(message, isError) {
    configStatus.textContent = message;
    configStatus.classList.toggle("error", Boolean(isError));
  }

  function sendSocketMessage(payload) {
    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    state.socket.send(JSON.stringify(payload));
  }

  function requestGlobalSettings() {
    const context = pluginUUID || propertyInspectorUUID;
    if (!context) {
      return;
    }
    sendSocketMessage({
      event: "getGlobalSettings",
      context
    });
  }

  function saveGlobalSettings() {
    const nextSettings = {
      ...state.settings,
      apiBaseUrl: normalizeBaseUrl(apiBaseUrlInput.value)
    };

    state.settings = nextSettings;
    apiBaseUrlInput.value = nextSettings.apiBaseUrl;

    const context = pluginUUID || propertyInspectorUUID;
    if (context) {
      sendSocketMessage({
        event: "setGlobalSettings",
        context,
        payload: nextSettings
      });
    }

    setStatus("Settings saved", false);
    void refreshLayoutConfiguration();
  }

  function renderSummary(configuration) {
    const rows = Number(configuration.rows || 0);
    const columns = Number(configuration.columns || 0);
    const pageCount = Number(configuration.pageCount || 0);
    const buttonCount = Number(configuration.buttonCount || 0);
    const mode = String(configuration.layoutMode || "n/a");

    summary.innerHTML = [
      ["Mode", mode],
      ["Grid", `${columns} x ${rows}`],
      ["Pages", String(pageCount)],
      ["Buttons", String(buttonCount)]
    ]
      .map(
        ([label, value]) =>
          `<div class="item"><span class="label">${label}:</span> ${value}</div>`
      )
      .join("");
  }

  function renderPages(configuration) {
    const pages = Array.isArray(configuration.pages) ? configuration.pages : [];
    if (pages.length === 0) {
      pagesBody.innerHTML =
        '<tr><td colspan="4">No layout pages returned by the API.</td></tr>';
      return;
    }

    pagesBody.innerHTML = pages
      .map((page) => {
        const index = Number(page.index || 0);
        const title = String(page.title || "");
        const layoutId = String(page.layoutId || "");
        const buttonCount = Number(page.buttonCount || 0);
        return `<tr>
          <td>${index || "-"}</td>
          <td>${title || "-"}</td>
          <td>${layoutId || "-"}</td>
          <td>${buttonCount}</td>
        </tr>`;
      })
      .join("");
  }

  async function refreshLayoutConfiguration() {
    const baseUrl = normalizeBaseUrl(state.settings.apiBaseUrl);
    const endpoint = `${baseUrl}/api/hardware/streamdeck/configuration`;

    setStatus("Loading configuration...", false);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (!payload || payload.ok === false) {
        throw new Error(String(payload?.error || "Invalid payload"));
      }

      const configuration = payload.configuration || payload;
      renderSummary(configuration);
      renderPages(configuration);
      setStatus(`Updated from ${endpoint}`, false);
    } catch (error) {
      summary.innerHTML = "";
      pagesBody.innerHTML =
        '<tr><td colspan="4">Unable to load layout configuration.</td></tr>';
      setStatus(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
    }
  }

  function handleSocketMessage(raw) {
    let message;
    try {
      message = JSON.parse(raw.data);
    } catch (_error) {
      return;
    }

    if (message.event !== "didReceiveGlobalSettings") {
      return;
    }

    const incomingSettings =
      message.payload && typeof message.payload === "object"
        ? message.payload.settings
        : null;

    if (!incomingSettings || typeof incomingSettings !== "object") {
      return;
    }

    state.settings = {
      ...state.settings,
      ...incomingSettings,
      apiBaseUrl: normalizeBaseUrl(incomingSettings.apiBaseUrl)
    };
    apiBaseUrlInput.value = state.settings.apiBaseUrl;
    void refreshLayoutConfiguration();
  }

  function connectPropertyInspectorSocket() {
    if (!socketPort || !propertyInspectorUUID) {
      return;
    }

    try {
      const socket = new WebSocket(`ws://127.0.0.1:${socketPort}`);
      state.socket = socket;

      socket.addEventListener("open", () => {
        sendSocketMessage({
          event: registerEvent,
          uuid: propertyInspectorUUID
        });
        requestGlobalSettings();
      });

      socket.addEventListener("message", handleSocketMessage);
      socket.addEventListener("close", () => {
        state.socket = null;
      });
    } catch (_error) {
      state.socket = null;
    }
  }

  function startAutoRefresh() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }
    state.refreshTimer = setInterval(() => {
      void refreshLayoutConfiguration();
    }, REFRESH_INTERVAL_MS);
  }

  saveSettingsButton.addEventListener("click", saveGlobalSettings);
  refreshConfigButton.addEventListener("click", () => {
    void refreshLayoutConfiguration();
  });

  apiBaseUrlInput.value = state.settings.apiBaseUrl;
  connectPropertyInspectorSocket();
  startAutoRefresh();
  void refreshLayoutConfiguration();
})();
