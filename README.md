# StreamDeck Custom API Plugin (Scaffold)

TypeScript/Node Stream Deck plugin scaffold that reads layout/state from a Custom API and renders runtime keys dynamically.

## Implemented behavior

- Reads API config with default base URL: `http://127.0.0.1:8787`
- Fetches layout from `GET /api/hardware/streamdeck/layout`
- Polls key state from `GET /api/hardware/streamdeck/layout/<layoutId>/state`
- Renders keys by position (`row`/`column`) with runtime title and color
- Supports key action routing (`GET`/`POST`) on key press
- Supports folder-style page navigation (`targetPageId`) and back keys
- Polls layout periodically so new API objects/groups/actions appear without profile reimport
- Shows clear offline visual state if API calls fail

## Project structure

- `src/main.ts`: entrypoint (Stream Deck mode + local dev mode)
- `src/runtime/runtime-controller.ts`: layout/state sync, navigation, key handling
- `src/api/custom-api-client.ts`: HTTP client for layout/state/action calls
- `src/layout/normalize.ts`: tolerant parser for layout/state payload variants
- `src/streamdeck/connection.ts`: Stream Deck WebSocket protocol connection
- `src/streamdeck/key-image.ts`: dynamic SVG key rendering (state color + label)
- `scripts/package-plugin.mjs`: builds `.streamDeckPlugin` artifact
- `scripts/generate-api-map.mjs`: generates a key-to-endpoint API map markdown file
- `assets/manifest.template.json`: Stream Deck manifest template

## Expected API shape

The parser supports both canonical page/key payloads and the current Amadeus `layouts/buttons` payload.

### Layout endpoint

`GET /api/hardware/streamdeck/layout`

```json
{
  "id": "main-layout",
  "rootPageId": "home",
  "pages": [
    {
      "id": "home",
      "keys": [
        {
          "id": "lights.toggle",
          "row": 0,
          "column": 0,
          "title": "Lights",
          "route": { "method": "POST", "path": "/api/lights/toggle" }
        },
        {
          "id": "mixers.folder",
          "row": 0,
          "column": 1,
          "title": "Mixers",
          "kind": "folder",
          "targetPageId": "mixers"
        }
      ]
    }
  ]
}
```

### State endpoint

`GET /api/hardware/streamdeck/layout/<layoutId>/state`

```json
{
  "byKeyId": {
    "lights.toggle": {
      "state": "active",
      "label": "Lights On",
      "color": "#2E9F45"
    }
  }
}
```

### Amadeus shape (also supported)

Layout:

```json
{
  "device": { "columns": 8, "rows": 4 },
  "layouts": [
    {
      "layoutId": "xl-page-1-obj-select",
      "title": "Page 1 - Obj Select",
      "buttons": [
        { "row": 0, "col": 0, "title": "Status", "method": "GET", "path": "/api/hardware/streamdeck/status" }
      ]
    }
  ]
}
```

State:

```json
{
  "layoutId": "xl-page-1-obj-select",
  "buttons": [
    {
      "row": 0,
      "col": 0,
      "path": "/api/hardware/streamdeck/status",
      "state": { "state": "active", "label": "LIVE", "color": "#1f8f5f" }
    }
  ]
}
```

Supported visual states: `active`, `inactive`, `mixed`, `disabled`.

## API visibility

Generate a clear key-to-endpoint map from the live API:

```bash
npm run api:map
```

Output file:

- `API_ROUTE_MAP.md`

Optional arguments:

```bash
npm run api:map -- --base-url http://127.0.0.1:8787 --out API_ROUTE_MAP.md
```

At runtime, key presses also log the invoked API method/path in plugin logs.

## Configure API URL

Priority order:

1. Stream Deck global settings key: `apiBaseUrl`
2. Environment variable: `STREAMDECK_CUSTOM_API_BASE_URL`
3. Default: `http://127.0.0.1:8787`

Optional environment settings:

- `STREAMDECK_LAYOUT_POLL_MS` (default `5000`)
- `STREAMDECK_STATE_POLL_MS` (default `1000`)
- `STREAMDECK_API_TIMEOUT_MS` (default `2500`)

## Local dev mode (hot reload)

```bash
npm install
npm run dev
```

This runs without Stream Deck and prints key render updates to console.

Dev commands:

- `press <row> <column>`: simulate key press
- `refresh`: force layout/state reload cycle
- `quit`: exit

## Build and release

```bash
npm run build
```

Output:

- Plugin folder: `release/com.loevano.streamdeckcustomapi.sdPlugin`
- Installable artifact: `release/com.loevano.streamdeckcustomapi-<version>.streamDeckPlugin`

`npm run release` is an alias for `npm run build`.

## Install in Stream Deck

1. Build the project (`npm run build`).
2. Double-click the generated `.streamDeckPlugin` file.
3. Add `Dynamic API Key` action to each key slot you want controlled dynamically.
4. Start your API server and verify keys populate from layout endpoint.

## Definition-of-done mapping

- New object in Amadeus creates a usable key automatically: achieved via periodic layout polling and rerender.
- Key press triggers the correct API route: handled by runtime route invocation.
- Key visuals reflect runtime state: state polling + per-key rendering.
- No profile reimport after show edits: layout is pulled dynamically at runtime.
