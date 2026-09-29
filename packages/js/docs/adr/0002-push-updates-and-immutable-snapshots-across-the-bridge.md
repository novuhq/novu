---
status: accepted
date: 2026-09-04
---

# Outlets receive pushed updates and immutable notification snapshots

Host content inside an outlet was torn down and recreated on every notification change because the contract was `(el, data) => unmount` and the engine re-ran it whenever the data or the renderer changed. We decided that a renderer may return `{ update(data), unmount() }`: the engine mounts an outlet once per row, pushes each change through `update` with a new immutable `Notification` snapshot, and remounts only when the renderer function itself changes. `mountComponent` returns the same handle shape for the host-to-engine direction. Returning a bare cleanup function keeps the old remount behaviour, so existing hosts are untouched.

## Considered options

- Mutable `Notification` objects updated in place (tried in PR #7869). Rejected: stable identity removes the remount but also removes every change signal, forcing ad-hoc notify-by-id events.
- Pull model handing the host `{ subscribe, getSnapshot }`. Rejected: fits `useSyncExternalStore` but every non-React host would need its own subscription loop, and push adapts into a store trivially.

## Consequences

- A render prop is a render function: it runs on every notification update and on every host re-render, and whatever it returns is reconciled by the host. Previously it ran once per mount and its result was frozen until the next remount. No compatibility switch is offered; side effects inside render props are the user's responsibility.
- The host keeps the latest render prop in a ref and hands the engine one stable function per outlet, so a new inline arrow on the host side never reaches the engine.
