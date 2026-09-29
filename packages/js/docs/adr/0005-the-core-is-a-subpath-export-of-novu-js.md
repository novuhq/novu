---
status: accepted
date: 2026-09-04
---

# The core ships as `@novu/js/ui-core` and never touches JSX

The framework-neutral core (stores, style resolution and injection, formatting, markdown tokens, the notification item controller, the bridge types) has to be importable by the Solid engine and by `@novu/react` alike, and later by any other host wrapper. We decided to ship it as a subpath export `@novu/js/ui-core` from `packages/js/src/ui/core`, next to `./ui` and `./internal`, rather than hiding it in `./internal` or splitting a package. A Biome `noRestrictedImports` rule keeps it honest: the core may import `solid-js` and `solid-js/store` for reactivity, never `solid-js/web` or anything under `packages/js/src/ui/components`. Anything that produces JSX belongs to a renderer.

## Considered options

- Fold into `@novu/js/internal`. Rejected: that path is documented as private plumbing for wrappers, and the core is a stable contract other hosts will build on.
- A separate `@novu/inbox-core` package. Rejected for now: one more package to version, publish and align in the release train, for a boundary the subpath and the lint rule already enforce.
