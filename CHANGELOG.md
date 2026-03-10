# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and Semantic Versioning.

## [Unreleased]

### Added

- Initial TypeScript Stream Deck plugin scaffold.
- Dynamic layout fetch and state polling runtime.
- Multi-page navigation support for folder/back key behavior.
- Offline/error key rendering behavior.
- Packaging script for `.streamDeckPlugin` output.
- Local dev mode for simulated key presses and hot reload workflow.
- API route map generator script for documenting key-to-endpoint mapping.
- Property Inspector (`config tab`) with a dedicated Stream Deck Layout Configuration section backed by `/api/hardware/streamdeck/configuration`.

### Changed

- Layout/state normalization now supports Amadeus `layouts/layoutId/buttons` payloads.
- State polling now resolves per-page `layoutId` endpoints and merges runtime key state.
- Stable key-id mapping now matches keys and state entries by page + position + route path.
- Plugin packaging now includes runtime `node_modules` dependencies required on Stream Deck.
- Keys now render API name as title and live status text as subtitle for clearer control feedback.
- Key presses now log invoked API method and route path for easier tracing.
- Removed key press overlay icons (`showOk`/`showAlert`) to keep key labels unobstructed.
- Empty/unmapped key slots now render fully transparent.
- Layout normalization now auto-wires parent/child subpages (including common Obj/Group/Config hints), can split mixed Group Enable/Hide routes into separate pages, and creates a `Modulators` subpage when LFO routes are mixed into settings/config pages.

## [0.1.0] - 2026-03-10

### Added

- Initial repository scaffold and baseline implementation.
