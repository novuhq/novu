# Inbox rendering plan

Agreed on 2026-09-04 in a design interview and implemented the same day on the `inbox-rendering-redesign` branch; the notes under each milestone record where the implementation deviates from the plan. The decisions behind this plan are recorded in [`adr/`](./adr) (0001 to 0005); the vocabulary (engine, host, core, bridge, outlet, mount point, block, island, notification item) is defined in [`../CONTEXT.md`](../CONTEXT.md). Everything ships on one branch, in one PR, as one minor release of `@novu/js`, `@novu/react` and `@novu/nextjs`. The three milestones below are the order of work inside that branch.

## Why

Custom content inside the Inbox is torn down and recreated on every change. Four causes compound:

1. The outlet contract `(el, data) => unmount` has no update path; `ExternalElementRenderer` re-runs the whole mount inside `createEffect` whenever the notification or the render function changes (`src/ui/components/ExternalElementRenderer.tsx`).
2. Every mutation builds a `new Notification(...)` and the cache swaps the row (`src/notifications/helpers.ts`), so cause 1 fires on every `read()`, `archive()` and websocket update.
3. A new inline render prop on the host side reaches the engine as a new function, which fires cause 1 for every visible row.
4. React portals in `packages/react/src/components/Renderer.tsx` are unkeyed, so removing one portal remounts every portal after it.

The same structure makes the built-in notification item impossible to reuse or rearrange from React: it exists only as Solid markup inside the engine. PR #7869 (March 2025) tried mutable notifications and stalled on exactly this.

## Target architecture

```mermaid
flowchart LR
  subgraph host["Host: @novu/react"]
    outlet_host["Outlet host<br/>(keyed portals, store)"]
    blocks["NotificationItem blocks"]
    mounter["Mounter<br/>(islands)"]
  end
  subgraph engine["Engine: @novu/js/ui (Solid)"]
    shell["Shell: popover, bell, header,<br/>tabs, list, preferences,<br/>subscription, connect buttons"]
    solid_item["Solid notification item"]
    islands["Islands: default actions,<br/>custom actions, bell"]
    adapters["Solid contexts<br/>(adapters over core stores)"]
  end
  subgraph core["Core: @novu/js/ui-core"]
    stores["Stores: appearance, localization,<br/>inbox state, counts"]
    style["Style tables, resolveStyle,<br/>style injection"]
    controller["Item controller,<br/>formatters, markdown tokens"]
    bridge_types["Bridge types:<br/>OutletHandle, MountHandle"]
  end
  data["Data: @novu/js<br/>(Novu client, caches, immutable Notification)"]

  shell -- "outlet: mount once, update(snapshot)" --> outlet_host
  outlet_host --> blocks
  blocks -- "mountComponent({ bare }) → MountHandle" --> mounter
  mounter --> islands
  solid_item --> adapters
  blocks --> stores
  blocks --> style
  blocks --> controller
  adapters --> stores
  stores --> data
```

- **Data** stays as it is. `Notification` remains an immutable snapshot; a change produces a new instance.
- **Core** is framework-neutral. It may import `solid-js` and `solid-js/store` for reactivity, never `solid-js/web` or anything under `src/ui/components`.
- **Engine** keeps every pixel of the shell and its own copy of the notification item. Its contexts become thin adapters that expose the exact accessor API they expose today, so the roughly 180 call sites do not change.
- **Host** renders outlets through one store per engine instance, renders the structural parts of the item natively as `NotificationItem`, and mounts islands for the interactive leaves.

## Public API after the change

### `@novu/react`

```tsx
import { Inbox, NotificationItem } from '@novu/react';

// built-in look, reused from a render prop
<Inbox renderNotification={(n) => <NotificationItem notification={n} />} />

// built-in look, one part swapped
<Inbox renderNotification={(n) => <NotificationItem notification={n} renderBody={(n) => <Body body={n.body} />} />} />

// rearranged
<Inbox
  renderNotification={(n) => (
    <NotificationItem notification={n}>
      <NotificationItem.Date />
      <NotificationItem.Avatar />
      <NotificationItem.Content>
        <NotificationItem.Subject />
        <NotificationItem.Body />
        <NotificationItem.CustomActions />
      </NotificationItem.Content>
      <NotificationItem.DefaultActions />
      <NotificationItem.Dot />
    </NotificationItem>
  )}
/>
```

- `NotificationItem` props: `notification` (required), `children`, `className`, `onNotificationClick`, `onPrimaryActionClick`, `onSecondaryActionClick`, `renderAvatar`, `renderSubject`, `renderBody`, `renderDefaultActions`, `renderCustomActions`. No children means the built-in arrangement; children mean exactly what was passed. Handlers fall back to the ones given to `Inbox`.
- Parts: `Avatar`, `Content`, `Text`, `Subject`, `Body`, `Date`, `Dot`, `CustomActions`, `DefaultActions`. No required props; every part accepts `className`; `Subject`, `Body` and `Date` accept `children` to replace their content. `CustomActions` and `DefaultActions` are islands. `Text` groups the subject and the body, the way the default item's `notificationTextContainer` does; it was added during implementation so the default arrangement can be reproduced part for part.
- Render props are render functions: `renderNotification`, `renderBell`, `renderAvatar`, `renderSubject`, `renderBody`, `renderDefaultActions`, `renderCustomActions`, `renderPreferences` and icon overrides run on every update and every host re-render, and whatever they return is reconciled. No compatibility switch.
- Everything exported today keeps its name and signature. `Bell` stays an island.

### `@novu/js/ui`

```ts
type OutletHandle<T> = { update?: (data: T) => void; unmount: () => void };
type NotificationRenderer = (el: HTMLDivElement, notification: Notification) => OutletHandle<Notification> | (() => void);
// same widening for AvatarRenderer, SubjectRenderer, BodyRenderer, DefaultActionsRenderer,
// CustomActionsRenderer, BellRenderer, IconRenderer and the subscription PreferencesRenderer

type MountHandle<P> = { update: (props: P) => void; unmount: () => void };
mountComponent({ name, element, props, bare? }): MountHandle<P>;
```

- A renderer that returns a bare function keeps today's remount-on-change behaviour.
- `bare: true` skips the `Root` wrapper and marks the mount point as an island. It is for mounting inside DOM that already sits under an engine root.
- `unmountComponent(element)` stays for callers that hold no handle.

### `@novu/js/ui-core`

New subpath. Exports the stores' types and factories, the style tables and `resolveStyle`, the formatters, `parseMarkdownIntoTokens`, the notification item controller, and the bridge types. Consumers: `@novu/js/ui` and `@novu/react`; later any other host wrapper.

## Milestone 1: bridge repair

Goal: no remount on `read()`, on websocket updates, or on a parent `setState`, for every existing render prop and icon override. Independently shippable behaviour, even though it ships with the rest.

Engine:

- `src/ui/types.ts`: add `OutletHandle`, `MountHandle`, widen every renderer type as listed above.
- `src/ui/components/ExternalElementRenderer.tsx`: take `data` as an accessor and `render` as the renderer. Mount once in `onMount`; a `createEffect` on `data` calls `handle.update` when the handle has one and otherwise unmounts and remounts; a change of the `render` prop always remounts; `onCleanup` calls `unmount`. The root div gets `display: contents` and a `data-novu-outlet` attribute with an engine-generated id that is unique per outlet instance, never the notification id, so two mounted components showing the same notification cannot collide in a host store.
- Call sites: `src/ui/components/Notification/Notification.tsx`, `Notification/DefaultNotification.tsx`, `elements/Bell/Bell.tsx`, `shared/IconRendererWrapper.tsx`, `subscription/SubscriptionPreferences.tsx`, the five call sites of `ExternalElementRenderer`. Each passes the reactive data accessor instead of reading it inside the render closure.
- `src/ui/novuUI.tsx`: `mountComponent` returns `MountHandle`; `update` reuses `#updateComponentProps`; `unmount` deletes the entry. Accept `bare`. Remove the `isConnected` workarounds if any remain.
- `src/ui/components/Renderer.tsx`: honour `bare` by rendering the component without `Root`, set `display: contents` on Solid's portal container for bare mounts, add `data-novu-island` to the mount point, and drop the `nt-h-full` hack for bare mounts.

Host:

- `packages/react/src/context/RendererContext.tsx` and `components/Renderer.tsx`: replace the `useState` map with an outlet store per engine instance (immutable map, `subscribe`, `getSnapshot`) read through `useSyncExternalStore`. `OutletHost` renders `createPortal(<OutletContent .../>, el, outletId)` for each entry; `OutletContent` calls the render function with the current data during its own render.
- New hook `useOutletRenderer(renderProp)`: keeps the latest render prop in a ref and returns one stable adapter `(el, data) => OutletHandle` per outlet kind. Used by `components/Inbox.tsx`, `Notifications.tsx`, `InboxContent.tsx`, `Bell.tsx`, `subscription/DefaultSubscription.tsx` and `utils/appearance.ts` for icon overrides. Delete the `renderNotification ? ... : undefined` ladders.
- `components/Mounter.tsx`: `useLayoutEffect`; keep the `MountHandle`; call `update` on prop changes and `unmount` on cleanup; expose a `bare` option.
- `components/NovuUI.tsx`: render `NovuUIProvider`, the outlet host and the children together, so portal content lives under the provider. Remove `withRenderer` and its HOC wrappers from `Inbox.tsx`, `Notifications.tsx`, `InboxContent.tsx`, `Bell.tsx`, `subscription/Subscription.tsx`, `connect-chat/ConnectChat.tsx`, the Slack, MS Teams and Telegram components.
- `packages/react/src/components/Preferences.tsx` and the other `Default*` mounters: adopt the handle so conditionally unmounted host components no longer leak engine entries.

Done when:

- A stateful component inside `renderNotification` keeps its state across `notification.read()`, across a websocket update, and across a parent `setState`.
- Removing one custom item from the list does not remount the others.
- Unmounting `<Notifications />` inside `<Inbox>` children removes its entry from the engine.
- An island mounted from a layout effect has DOM before first paint.
- Existing `@novu/js` code that returns a bare cleanup still works.

## Milestone 2: core extraction

Goal: shared state and shared behaviour live in `@novu/js/ui-core`; Solid consumes it unchanged; React can read it.

Implementation notes: the core also exports `subscribeAccessor`, which adapts a store accessor to a plain subscription so React can use `useSyncExternalStore` without importing `solid-js`; the localization store exposes its merged `dictionary` so hosts re-render on any string change; the badge primitive reads its classes from `badgeStyles` in the style tables because the item's date part renders one; the counts store keeps `selectNewMessagesCount` next to `createCountsKey` for the Solid hooks. The vitest migration surfaced three tests that had gone stale against current code and one jest-only habit, hooks returning the spy they create, which vitest treats as a cleanup function.

Layout:

```
packages/js/src/ui/core/
  index.ts
  bridge/types.ts            OutletHandle, MountHandle, mount options
  stores/appearance.ts       input appearance → elements, variables, icons, animations, class map, id, container
  stores/localization.ts     input localization → t, locale
  stores/inbox.ts            status, filter, limit, tabs, activeTab, isOpened, navigate, session-derived flags, Inbox-level handlers
  stores/counts.ts           unread counts, per-tab counts, new-message counts; websocket and count-sync handlers; lazy start
  style/tables.ts            appearance key + base class per part of the item and the bell (severity maps included)
  style/resolveStyle.ts      lifted from helpers/useStyle.ts, takes an appearance snapshot
  style/inject.ts            default css and appearance rules into document or shadow root, lifted from AppearanceContext and Renderer
  format/                    formatToRelativeTime, formatSnoozedUntil, normalizeIntlLocale
  markdown.ts                re-export of parseMarkdownIntoTokens
  item/controller.ts         click, primary and secondary action behaviour, clickable predicate, island boundary check
```

Tasks:

- Stores are built with `createSignal`, `createMemo` and `createEffect` inside a `createRoot` created in the `NovuUI` constructor and disposed in `unmount()`. Every accessor React can read returns a stable reference until it changes: `variables` and `icons` in `src/ui/context/AppearanceContext.tsx` become memos. The counts store starts its handlers on first subscription and stops on last unsubscribe.
- `src/ui/context/{Appearance,Localization,Inbox,Count,Novu}Context.tsx` become adapters: they take the store from the `NovuUI` instance and expose today's accessor API. `FocusManagerContext` stays engine-only.
- `src/ui/helpers/useStyle.ts` becomes a thin wrapper around `resolveStyle`.
- The Solid item and bell read their keys and base classes from `style/tables.ts`. `SEVERITY_TO_BAR_KEYS`, `SEVERITY_TO_NOTIFICATION_KEYS`, `SEVERITY_GLOW_KEYS` and `SEVERITY_TO_CONTAINER_KEYS` move there.
- `item/controller.ts` receives a snapshot, the resolved handlers and `navigate`, and returns `onClick`, `onPrimaryAction`, `onSecondaryAction` and `isClickable`. `onClick` ignores events whose target is inside `[data-novu-island]`. `DefaultNotification.tsx` uses it.
- Packaging: tsup entry `'ui-core/index': './src/ui/core/index.ts'` in `tsup.config.ts`; `exports['./ui-core']` and `files` in `package.json`; a `ui-core/package.json` stub next to `ui/`, `internal/` and `themes/`; `attw --pack` in `check-exports` must pass; `size-limit.mjs` budget unchanged.
- Lint: a `noRestrictedImports` override in `biome.json` for `packages/js/src/ui/core/**` forbidding `solid-js/web` and `../components/*`.
- Tests: migrate the seventeen jest files to vitest (`vitest.config.ts` with `vite-plugin-solid` for `src/ui`), remove `jest.config.cjs`, `jest.setup.ts` and the jest dependencies, and add `packages/react/vitest.config.ts` with jsdom and Testing Library.

Done when:

- `@novu/js/ui` behaves exactly as before with the contexts replaced by adapters; no test or playground page changes behaviour.
- A `NovuUI` that only mounts a connect button opens no websocket subscription for counts.
- `pnpm build` in `packages/js` passes `check-exports` and the size budget with the new subpath.
- `pnpm test` runs vitest in both packages; jest is gone.

## Milestone 3: blocks

Implementation notes: the handlers given to `Inbox`, `Notifications` or `InboxContent` reach a `NotificationItem` rendered inside their `renderNotification` through a React context that `useNotificationOutlets` wraps around the render prop's output, so the engine does not carry host handlers; the React `NovuUI` component also puts the host's own `appearance.icons` into its context so the date part renders a custom clock icon natively. The engine's `DefaultNotification` renders the same `NotificationDefaultActions` and `NotificationCustomActions` components it exposes as islands.

Engine:

- `src/ui/components/Notification/NotificationDefaultActions.tsx` and `NotificationCustomActions.tsx`: mountable components registered in `novuComponents` under `NotificationDefaultActions` and `NotificationCustomActions`, taking `{ notification, onPrimaryActionClick?, onSecondaryActionClick? }`, extracted from `DefaultNotification.tsx`. The Solid item renders them in place.

Host (`packages/react/src/components/notification-item/`):

- `NotificationItem.tsx`: the root anchor with severity classes from the style tables, the controller's click handler, a context carrying the snapshot, the resolved handlers and the `render*` props, and the default arrangement when `children` is undefined.
- `parts/Avatar.tsx`, `Content.tsx`, `Subject.tsx`, `Body.tsx`, `Date.tsx`, `Dot.tsx`: native React on the style tables, localization and formatters from the core; `Subject` and `Body` render markdown tokens with the same `strong` and `em` appearance keys as Solid. `Date` reuses the minute tick from the Solid item.
- `parts/DefaultActions.tsx`, `CustomActions.tsx`: islands through `Mounter` with `bare: true`, updated in place with the snapshot.
- Hooks (internal): `useEngineStore(accessor)` on `observable` plus `useSyncExternalStore`, and `useStyle`, `useLocalization`, `useInboxState` on top of it. The React `useStyle` takes the same arguments as the Solid one.
- Exports: `packages/react/src/components/index.ts` and `src/index.ts`; `packages/react/src/server/index.tsx` gains a `NotificationItem` stub with the same static parts, or Next.js builds fail on the missing export; `packages/nextjs/src/app-router/index.ts` and `pages-router/index.ts` re-export it.

Docs and playground:

- `docs/platform/inbox/advanced-customization/customize-notification-items.mdx`: a `NotificationItem` section with the three usages, and the warning that `renderNotification` forces rebuilding the built-in actions rewritten.
- `docs/platform/sdks/react.mdx`: `NotificationItem` reference; a note that render props are render functions.
- `playground/nextjs/src/pages/notification-item/index.tsx` plus a link in `src/components/Header.tsx`.

Done when:

- `<NotificationItem notification={n} />` renders the same DOM structure, classes and text as the Solid item for the same snapshot and appearance, including `appearance.elements` overrides and `appearance.icons.clock`.
- A rearranged item keeps hover-reveal of the default actions, severity styling and the click behaviour.
- Clicking archive inside `NotificationItem.DefaultActions` archives without marking read or navigating.
- Both islands update in place when the snapshot changes and unmount with their block.

## Test plan

- Core (node): store transitions, lazy counts, `resolveStyle`, the controller including the island boundary, bridge handle semantics with a legacy cleanup return.
- Engine (jsdom, vitest with the Solid plugin): outlet mounts once, `update` on a new snapshot, remount on renderer change, `mountComponent` handle and bare mode, the leak regression.
- Host (jsdom, Testing Library): state survival across `read()` and parent re-render, keyed portal removal, `NotificationItem` with and without children, island before paint, render function called on update.
- Parity is by construction: a base class or appearance key written in JSX instead of `style/tables.ts` is a review defect, not a test failure.

## Risks and guards

- **Event order across renderers.** Solid delegates clicks to the document; React listens on its root container. The island boundary in the controller is the only thing that stops a React root handler from firing before an island's `stopPropagation`. Covered by a test in milestone 3.
- **Stable snapshots.** `useSyncExternalStore` loops forever on an accessor that returns a fresh object each call. Every store accessor React reads is a memo; the lint rule cannot catch this, so it is a review checklist item for milestone 2.
- **Layout through wrappers.** Outlets, mount points and Solid's portal container sit between flex parents and blocks; all three carry `display: contents`, and the item root keeps `nt-relative` so the absolutely positioned actions island resolves against it.
- **Duplicate root ids.** `Root` renders `novu-root-{id}` for every mounted component already; bare mounts add none.
- **Bundle budget.** The UMD build carries the engine plus the core, which is moved code, not new code; `size-limit.mjs` runs in `postbuild` and fails the build if the budget is exceeded.

## Out of scope

- Server rendering of Inbox markup.
- Native React versions of the shell, the bell or the actions. Any of them can become a block later on the same core.
- Vue or Angular wrappers. They gain the same bridge and core contract without further work here.
