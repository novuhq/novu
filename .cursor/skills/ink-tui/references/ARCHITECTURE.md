# TUI Architecture: Reactive Flow, State, and Screen Management

## Core principle

The rendered screen is a pure function of session state. Nobody imperatively pushes screens around. Business logic sets state through store setters, the router derives which screen should be active.

## Session

**Source of truth:** `src/lib/wizard-session.ts` — read the `WizardSession` interface for current fields.

`WizardSession` is the single source of truth for every decision the wizard needs: CLI args, detection results, OAuth credentials, lifecycle phase, and runtime display data.

`buildSession(args)` creates a session from CLI args. Pre-TUI fields (`installDir`, `integration`, `frameworkConfig`) can be set directly. Reactive fields that affect screen resolution must go through store setters.

Key enums (defined in `wizard-session.ts`):
- `RunPhase` — lifecycle phase (Idle → Running → Completed | Error)
- `OutroKind` — outro outcome (Success, Error, Cancel)

## Router

**Source of truth:** `src/ui/tui/router.ts` — read the flow arrays for current screen predicates.

### Screen resolution

The `WizardRouter` has a `resolve(session)` method that walks the flow pipeline and returns the first incomplete screen:

```ts
resolve(session: WizardSession): ScreenName {
  if (overlays.length > 0) return top overlay;
  for (entry of flow) {
    if (entry.show && !entry.show(session)) continue;  // skip hidden
    if (entry.isComplete && entry.isComplete(session)) continue;  // skip complete
    return entry.screen;  // first incomplete = active
  }
  return last screen;  // all complete
}
```

There is no cursor. No `advance()`. No `jumpTo()`. The screen is resolved fresh every render.

### Flow definitions

Flows are declarative arrays of `FlowEntry`:

```ts
interface FlowEntry {
  screen: Screen;
  show?: (session: WizardSession) => boolean;      // skip if false
  isComplete?: (session: WizardSession) => boolean; // resolved if true
}
```

See `router.ts` for the current wizard flow pipeline and `isComplete` predicates per screen.

### Enums

See `router.ts` for current values:
- `Screen` — flow screen names
- `Overlay` — interrupt screen names
- `Flow` — named flow pipelines

### Overlays

Overlays are interrupts — they push on top of the flow and pop to resume:

```ts
store.pushOverlay(Overlay.Outage);  // outage screen appears
store.popOverlay();                  // flow screen resumes
```

Overlays don't affect the flow. They're orthogonal.

### Adding a screen

1. Add to `Screen` enum in `router.ts`
2. Add a `FlowEntry` to the flow array with an `isComplete` predicate
3. Create the component in `screens/`
4. Register in `screen-registry.tsx`

No other files change.

## Store

**Source of truth:** `src/ui/tui/store.ts` — read the class for current setters, atoms, and accessors.

`WizardStore` uses nanostores atoms internally and exposes `subscribe()`/`getSnapshot()` for React's `useSyncExternalStore`.

### Pattern: session setters

Every session mutation that affects screen resolution goes through an explicit setter. Each setter mutates the field and calls `emitChange()`, which bumps a version counter and triggers React re-renders. On the next render, `store.currentScreen` calls `router.resolve(session)`.

Read the "Session setters" section of `store.ts` for the current list.

### Pattern: observation state

Agent-produced data (not part of session flow) is stored in separate atoms on the store:

- `$statusMessages` / `pushStatus()` — agent log lines
- `$tasks` / `syncTodos()`, `setTasks()` — agent task progress
- `$eventPlan` / `setEventPlan()` — planned analytics events from `.posthog-events.json`

These follow the same pattern: private atom → public getter → public setter that calls `emitChange()`.

## WizardUI interface

**Source of truth:** `src/ui/wizard-ui.ts` — read the interface for current methods.

The bridge between business logic and the store. Business logic calls `getUI()` methods, which translate to store setters in the TUI implementation (`InkUI` in `src/ui/tui/ink-ui.ts`).

Two categories of methods:
- **Session-mutating** — trigger screen resolution (e.g., `startRun()`, `setCredentials()`, `outro()`)
- **Observation** — display-only updates (e.g., `pushStatus()`, `syncTodos()`, `setEventPlan()`)

There are NO prompt methods. The TUI screens own all user input.

Both `InkUI` (TUI) and `LoggingUI` (`src/ui/logging-ui.ts`, CI mode) implement this interface.

## Screen registry

**Source of truth:** `src/ui/tui/screen-registry.tsx`

Maps screen names to React components. App.tsx calls the factory. Adding a screen to the registry requires no changes to App.tsx.

## Services

**Source of truth:** `src/ui/tui/services/`

Screens receive services via props instead of importing business logic. Services are created in the registry and injected into screens. Testable, swappable, no dynamic imports in React components.

## Error boundaries

`ScreenContainer` wraps every screen in a `ScreenErrorBoundary`. On crash:
1. Sets `outroData` with error message
2. Sets `runPhase = Error`
3. Router resolves to Outro

See `src/ui/tui/primitives/ScreenErrorBoundary.tsx`.

## Dark mode

`start-tui.ts` forces a black terminal background via ANSI escape codes on startup and resets on exit.

## Data flow summary

```
Business logic         →  getUI().setX()
  → InkUI              →  store.setX()
    → Store             →  atom.set(value); emitChange()
      → React re-render →  store.currentScreen → router.resolve(session)
        → Router        →  walks flow, returns first incomplete screen
```
