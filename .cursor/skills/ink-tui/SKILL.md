---
name: ink-tui-wizard
description: >
  Build terminal user interfaces (TUIs) using Ink (React for CLIs) and @inkjs/ui
  with a reactive, session-driven wizard pattern. Use when creating interactive CLI
  installation wizards, setup flows, or multi-step terminal applications in
  Node.js/TypeScript. Covers reactive screen resolution, declarative flow pipelines,
  overlay interrupts, session state management, Ink components, Flexbox terminal layout,
  and graceful degradation across terminal environments.
license: MIT
compatibility: Requires Node.js 18+. Designed for Claude Code or similar coding agents.
metadata:
  author: posthog
  version: "0.3"
  domain: cli-tui
---

# Ink TUI Wizard Skill

Build beautiful, interactive terminal wizard interfaces using Ink (React for CLIs).

Ink is the dominant Node.js TUI framework — used by Claude Code (Anthropic), Gemini CLI
(Google), GitHub Copilot CLI, Cloudflare Wrangler, Shopify CLI, Prisma, and many others.

## When to use this skill

- Creating multi-step CLI installation or setup wizards
- Building reactive, session-driven terminal interfaces
- Adding real-time progress, spinners, or status displays to CLI tools
- Any Node.js/TypeScript CLI that needs more than sequential prompts

## Core architecture

This skill follows a **reactive session-driven** pattern: the rendered screen is a pure
function of session state. Business logic sets state through store setters. The router
derives which screen should be active. Nobody imperatively pushes screens around.

See [references/ARCHITECTURE.md](references/ARCHITECTURE.md) for the full reactive
architecture: session, router, store, screen resolution, overlays, and data flow.

### Key concepts

- **WizardSession** (`src/lib/wizard-session.ts`) — single source of truth for all wizard decisions
- **WizardRouter** (`src/ui/tui/router.ts`) — declarative flow pipelines with `isComplete` predicates per screen
- **WizardStore** (`src/ui/tui/store.ts`) — nanostores-backed reactive store with explicit setters that trigger React re-renders via `useSyncExternalStore`
- **WizardUI** (`src/ui/wizard-ui.ts`) — interface bridging business logic to store; implemented by `InkUI` (TUI) and `LoggingUI` (CI)
- **Screen registry** (`src/ui/tui/screen-registry.tsx`) — factory function mapping screen names to components (App.tsx never changes)
- **Services** (`src/ui/tui/services/`) — injected into screens via props (no dynamic imports in React components)
- **Overlays** — interrupt stack for outage/error modals, orthogonal to flows

### Adding a screen

1. Create the component in `src/ui/tui/screens/`
2. Add to `Screen` enum in `router.ts`
3. Add a `FlowEntry` to the flow array with an `isComplete` predicate
4. Register in `screen-registry.tsx`

No other files change.

### Adding store state

Two patterns depending on the data:

- **Session state** (affects screen resolution): add field to `WizardSession`, add setter to `WizardStore` that calls `emitChange()`, add method to `WizardUI` interface + both implementations
- **Observation state** (display-only, e.g., agent progress): add private atom to `WizardStore`, add getter + setter, add method to `WizardUI` interface + both implementations

Read `store.ts` for examples of both patterns.

### Layout primitives

The project has reusable layout primitives in `src/ui/tui/primitives/`.
**Always use these instead of building from scratch.**

All primitives are barrel-exported from `src/ui/tui/primitives/index.ts`.
See [references/PRIMITIVES.md](references/PRIMITIVES.md) for the catalog.
Read each primitive's source file for its current props interface.

Shared style constants (`Colors`, `Icons`, `HAlign`, `VAlign`) live in
`src/ui/tui/styles.ts`.

**Playground**: Run `pnpm try --playground` to see all primitives in action.

### Enums everywhere

All state comparisons use TypeScript enums — no string literals. See the source files for current values:

- `Screen`, `Overlay`, `Flow` — in `router.ts`
- `RunPhase`, `OutroKind` — in `wizard-session.ts`
- `TaskStatus` — in `wizard-ui.ts`

### Key dependencies

```
ink                   # Core: React renderer for terminals (uses Yoga for Flexbox)
react                 # Peer dependency
@inkjs/ui             # Official component library: Select, TextInput, Spinner,
                      # ProgressBar, ConfirmInput, MultiSelect, Badge,
                      # StatusMessage, Alert, OrderedList, UnorderedList
figures               # Unicode/ASCII symbol fallbacks (cross-platform)
```

**Do NOT use** the older standalone packages (`ink-text-input`, `ink-select-input`,
`ink-spinner`). The `@inkjs/ui` package supersedes them.

### Project structure

```
src/ui/tui/
├── App.tsx                    # Thin shell — calls screen registry factory
├── store.ts                   # WizardStore: nanostores + session setters
├── router.ts                  # WizardRouter: flow pipelines + overlay stack
├── ink-ui.ts                  # InkUI: bridges getUI() calls to store setters
├── start-tui.ts               # TUI startup: dark mode, store, renderer
├── screen-registry.tsx         # Maps screen names to components + services
├── styles.ts                  # Colors, Icons, alignment enums
├── screens/                   # One file per screen — read for current set
├── primitives/                # Reusable layout components — read index.ts for exports
├── services/                  # Injectable service interfaces
└── components/
    └── TitleBar.tsx           # Top bar with version + feedback email
```

## Ink rendering model

Ink is `react-dom` but for terminals. It uses Yoga (Facebook's Flexbox engine) for layout.
Every `<Box>` is a flex container. All visible text MUST be inside `<Text>`.

| Browser             | Ink                                            |
| ------------------- | ---------------------------------------------- |
| `<div>`             | `<Box>`                                        |
| `<span>`            | `<Text>`                                       |
| CSS / className     | Props directly on `<Box>` and `<Text>`         |
| `onClick`           | `useInput()` hook                              |
| `window.innerWidth` | `useStdout().stdout.columns`                   |
| scroll              | `<Box overflow="hidden">` + manual offset      |
| `display: block`    | `<Box flexDirection="column">`                 |
| `display: flex`     | Default — every `<Box>` is already flex        |

## Terminal compatibility

- **Small terminals**: Check `useStdout().stdout.columns` and `.rows`
- **Piped input**: Detect `!process.stdin.isTTY` and fall back to LoggingUI
- **CI environments**: `--ci` flag uses LoggingUI (no TUI, no prompts)
- **Dark mode**: `start-tui.ts` forces black background via ANSI escape codes
- **True black text**: Use `color="#000000"` not `color="black"` (terminals render ANSI black as grey)
- **Ctrl+C**: Ink handles via `useApp().exit()`

## Reference files

- [references/ARCHITECTURE.md](references/ARCHITECTURE.md) — **Reactive architecture**: session, router, store, screen resolution, overlays, data flow. **Read this first when working on screen flow or state.**
- [references/PRIMITIVES.md](references/PRIMITIVES.md) — **TUI layout primitives**: catalog of all custom components with source file pointers.
- [references/INK-API.md](references/INK-API.md) — Complete Ink component and hook API reference
- [references/INKJS-UI.md](references/INKJS-UI.md) — @inkjs/ui component catalog with examples
- [references/TERMINAL-COMPAT.md](references/TERMINAL-COMPAT.md) — Terminal detection and graceful degradation
- [references/PATTERNS.md](references/PATTERNS.md) — Layout patterns and design recipes
- [scripts/scaffold.sh](scripts/scaffold.sh) — Bootstrap a new Ink wizard project
