# Inbox SDK

The client-side SDKs that render Novu's Inbox: one framework-agnostic engine (`packages/js`) and thin per-framework hosts (`packages/react`, `packages/nextjs`). The context exists because a single UI implementation has to serve many host frameworks without giving up native composition in each of them.

## Language

### Rendering

**Engine**:
The framework-agnostic UI runtime that owns the Inbox shell and renders it into DOM the host provides.
_Avoid_: Solid UI, novuUI, js UI

**Host**:
The consumer application's own component tree and framework, such as a React app.
_Avoid_: client, wrapper, consumer framework

**Core**:
The framework-neutral behaviour and styling logic that both the engine and host-native blocks call, so a block looks and acts the same wherever it is rendered.
_Avoid_: headless, shared helpers, utils

**Bridge**:
The contract through which the engine and the host mount, update and unmount each other's UI.
_Avoid_: renderer, mounter, portal

**Mount point**:
A DOM node the host hands to the engine so the engine can render a component into it.
_Avoid_: element, container, node

**Outlet**:
A DOM node the engine hands to the host so the host can render its own content into it.
_Avoid_: external element, slot, render target

**Block**:
A piece of the default UI that the host can render and compose natively, with behaviour and styling supplied by the core.
_Avoid_: default component, building block, primitive

**Island**:
A piece of engine-rendered UI placed inside host-owned DOM through the bridge, opaque to the host.
_Avoid_: embedded component, nested mount

**Render prop**:
A host-supplied function that produces the content of an outlet from the data the engine pushes to it.
_Avoid_: renderer, custom renderer, render callback

### Notifications

**Notification**:
An in-app message delivered to a subscriber, held by the SDK as an immutable snapshot; any change produces a new snapshot instead of altering the old one.
_Avoid_: message, notification object

**Notification item**:
The rendered representation of one notification in the list. The built-in item is a root that carries the item's behaviour and, without children, arranges all of its blocks in the default order; a host may pass its own arrangement of those blocks instead.
_Avoid_: row, list item, notification component, default notification
