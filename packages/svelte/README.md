# @novu/svelte

The Novu Inbox component for Svelte 5 applications.

## Installation

```bash
pnpm add @novu/svelte
```

## Usage

```svelte
<script lang="ts">
  import { Inbox } from '@novu/svelte';
</script>

<Inbox applicationIdentifier="your-application-identifier" subscriber="user-123" />
```

`Inbox` accepts the Novu connection options as flat props, including `subscriber` or the deprecated `subscriberId`, `subscriberHash`, `contextHash`, `apiUrl`, `backendUrl`, `socketUrl`, `socketOptions`, `useCache`, `defaultSchedule`, and `context`. UI options include `appearance`, `localization`, `tabs`, `preferencesFilter`, `preferenceGroups`, `preferencesSort`, and `routerPush`.

Inbox interaction and rendering props are passed through to the JavaScript Inbox renderer: `open`, `placement`, `placementOffset`, `renderBell`, `renderNotification`, `renderAvatar`, `renderSubject`, `renderBody`, `renderDefaultActions`, `renderCustomActions`, `onNotificationClick`, `onPrimaryActionClick`, and `onSecondaryActionClick`.

The component creates the Novu client and UI renderer only after mounting in the browser, so it can be rendered by SvelteKit during SSR.
