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

### Changed

- Layout/state normalization now supports Amadeus `layouts/layoutId/buttons` payloads.
- State polling now resolves per-page `layoutId` endpoints and merges runtime key state.
- Stable key-id mapping now matches keys and state entries by page + position + route path.
- Plugin packaging now includes runtime `node_modules` dependencies required on Stream Deck.
- Keys now render API name as title and live status text as subtitle for clearer control feedback.
- Key presses now log invoked API method and route path for easier tracing.

## [0.1.0] - 2026-03-10

### Added

- Initial repository scaffold and baseline implementation.
