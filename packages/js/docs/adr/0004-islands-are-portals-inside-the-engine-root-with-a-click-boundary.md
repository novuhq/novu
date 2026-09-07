---
status: accepted
date: 2026-09-04
---

# Islands are portals inside the engine root, mounted bare, behind a click boundary

Host-native blocks need to embed engine-rendered leaves such as the notification actions. We decided that an island is mounted from a layout effect through `mountComponent` with a `bare` option that skips the `Root` wrapper, stays a portal within the existing engine tree so it inherits stores and focus management, keeps the handle for in-place `update` and `unmount`, and marks its mount point with `data-novu-island`; the core click controller ignores any event whose target sits inside an island. Both the mount point and Solid's own portal div use `display: contents` so islands never affect layout.

The boundary exists because Solid delegates `onClick` to the document while React listens on its root container, so without it a React root handler would mark a notification read or navigate before an island's archive button could stop propagation.

## Considered options

- A separate Solid root per island with non-delegated `on:click` listeners. Rejected: providers duplicated per island and every primitive's event wiring changed, to avoid one guard.
- Mounting from `useEffect` as `Mounter` does today. Rejected: guarantees one blank frame per island.
