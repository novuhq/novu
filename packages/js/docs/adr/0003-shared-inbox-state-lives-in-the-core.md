---
status: accepted
date: 2026-09-04
---

# Shared Inbox state lives in the core, and every renderer subscribes to it

Appearance resolution, localization, inbox state (status, filter, tabs, session-derived flags, navigation) and unread counts were held in Solid contexts, so host-native blocks had no way to read them and would have drifted from the default look. We decided to move that state out of the Solid contexts into stores owned by the core and created per `NovuUI` instance; the Solid contexts become thin adapters that keep their current accessor API, and React reads the same stores through hooks. Row data is deliberately not part of this: it keeps flowing through outlet updates. The stores are built on Solid's reactive core (`createSignal`, `createMemo`, `createEffect` inside a `createRoot` owned by the `NovuUI` instance), so Solid components consume them unchanged and React subscribes through `observable(accessor)` and `useSyncExternalStore`; every accessor React reads must return a stable reference until it changes, so derived objects are memos, never fresh literals.

## Considered options

- Push shared state through every outlet update. Rejected: one push per visible row on any appearance or locale change, and nothing readable outside a row.
- Derive read-only stores from the existing Solid signals without moving them. Rejected as a half step: the same interface with two owners.
- A hand-rolled `{ get, set, subscribe }` store or a third-party signals library as the reactive primitive. Rejected: every memo and effect would be rewritten by hand, or a second reactive runtime would ship, to protect a Solid-free host that ADR 0001 rules out for the foreseeable future.

## Consequences

- The store extraction has to land before the first React block, and it touches all five Solid contexts and roughly 180 call sites, mitigated by keeping the adapter API unchanged.
- Stores that do work on activation, such as unread counts with their websocket handlers, must start lazily on first subscription so an instance that only mounts a connect button pays nothing.
