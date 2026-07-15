# Reference — Channel Connect Button templates

Placeholders: `<Channel>` = PascalCase (`Discord`), `<channel>` = kebab/lower (`discord`),
`<provider>` = the provider id string used by the API (`discord`).

Pick templates by model (see SKILL.md Step 0). Connection-based mirrors `SlackConnectButton` /
`MsTeamsConnectButton`; endpoint-based mirrors `TelegramConnectButton`.

---

## 1. Brand icon — `packages/js/src/ui/icons/<Channel>Colored.tsx`

Copy `TelegramColored.tsx` and swap the SVG paths. It receives a `class` prop.

```tsx
import type { JSX } from 'solid-js';

export const DiscordColored = (props: { class?: string }): JSX.Element => {
  return (
    <svg class={props.class} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* brand paths */}
    </svg>
  );
};
```

---

## 2a. Data hook (endpoint model only) — `packages/js/src/ui/api/hooks/use<Channel>Connection.ts`

Copy `useTelegramConnection.ts`. "Connected" = a subscriber endpoint exists for this
`providerId` + `integrationIdentifier`. Connection-based buttons skip this and reuse
`useChannelConnection`.

```ts
import { createEffect, createResource, createSignal } from 'solid-js';
import type { ChannelEndpointResponse, LinkChannelEndpointArgs } from '../../../channel-connections/types';
import { useNovu } from '../../context';

const DISCORD_PROVIDER_ID = 'discord';

export type UseDiscordConnectionOptions = {
  integrationIdentifier: string;
  subscriberId?: string;
};

export const useDiscordConnection = (options: UseDiscordConnectionOptions) => {
  const novuAccessor = useNovu();
  const [loading, setLoading] = createSignal(true);

  const [endpoint, { mutate, refetch }] = createResource(
    options,
    async ({ integrationIdentifier, subscriberId }): Promise<ChannelEndpointResponse | null> => {
      try {
        if (!integrationIdentifier) {
          return null;
        }

        const response = await novuAccessor().channelEndpoints.list({
          integrationIdentifier,
          providerId: DISCORD_PROVIDER_ID,
          subscriberId,
          limit: 1,
        });

        return response.data?.[0] ?? null;
      } catch {
        return null;
      }
    }
  );

  const link = async (args: LinkChannelEndpointArgs) => novuAccessor().channelEndpoints.link(args);

  const disconnect = async (identifier: string) => {
    setLoading(true);
    const response = await novuAccessor().channelEndpoints.delete({ identifier });
    if (!response.error) {
      mutate(null);
    }
    setLoading(false);

    return response;
  };

  createEffect(() => {
    setLoading(endpoint.loading);
  });

  return { endpoint, loading, mutate, refetch, link, disconnect };
};
```

---

## 2b. Core component — `packages/js/src/ui/components/<channel>-connect-button/<Channel>ConnectButton.tsx`

Read the full sibling for the exact JSX/appearance markup (it is verbose but identical
across buttons). The two skeletons below show only what differs by model. Reuse the
`buttonContent()` + `<Show>` markup verbatim from the sibling, swapping the icon and labels.

### Endpoint model (copy `TelegramConnectButton.tsx`)

```tsx
const PROVIDER_ID = 'discord';
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 120_000;

export const DiscordConnectButton = (props: DiscordConnectButtonProps) => {
  const novuAccessor = useNovu();
  const integrationIdentifier = () => props.integrationIdentifier;
  const resolvedSubscriberId = () => props.subscriberId ?? novuAccessor().subscriberId;
  const { endpoint, loading, disconnect, mutate, link } = useDiscordConnection({
    integrationIdentifier: integrationIdentifier(),
    subscriberId: props.subscriberId,
  });
  // ...polling with a `committed` one-shot guard, then on click:
  const result = await link({ integrationIdentifier: integrationIdentifier() });
  if (result.data?.url) {
    window.open(result.data.url, '_blank', 'noopener,noreferrer');
    startPolling(); // polls channelEndpoints.list(...) until data[0] exists
  }
};
```

### Connection model (copy `SlackConnectButton.tsx` / `MsTeamsConnectButton.tsx`)

```tsx
const connectionMode = () => props.connectionMode ?? 'subscriber';
const connectionIdentifier = () =>
  props.connectionIdentifier ??
  buildDefaultConnectionIdentifier(DEFAULT_DISCORD_CONNECTION_IDENTIFIER, resolvedSubscriberId());

const { connection, loading, disconnect, mutate, generateConnectOAuthUrl } = useChannelConnection({
  integrationIdentifier: integrationIdentifier(),
  connectionIdentifier: connectionIdentifier(),
  subscriberId: props.subscriberId,
});
// on click:
const result = await generateConnectOAuthUrl({
  integrationIdentifier: integrationIdentifier(),
  connectionIdentifier: connectionIdentifier(),
  connectionMode: connectionMode(),
  autoLinkUser: props.autoLinkUser ?? true,
});
if (result.data?.url) {
  window.open(result.data.url, '_blank', 'noopener,noreferrer');
  startPolling(); // polls channelConnections.get(connectionIdentifier) until data exists
}
```

Add a constant to `packages/js/src/ui/components/constants.ts` for the connection model:

```ts
export const DEFAULT_DISCORD_CONNECTION_IDENTIFIER = 'chconn-discord-default';
```

---

## 3. Register + export in `packages/js`

`src/ui/components/Renderer.tsx` — three edits:

```tsx
import { DiscordConnectButton } from './discord-connect-button/DiscordConnectButton';

export const novuComponents = {
  // ...existing
  DiscordConnectButton,
};

const CHANNEL_COMPONENTS = [
  // ...existing
  'DiscordConnectButton',
];
```

`src/ui/components/index.ts`:

```ts
export * from './discord-connect-button/DiscordConnectButton';
```

`src/ui/index.ts` — add the props type to the existing `*ConnectButtonProps` type export block.

---

## 4. React wrapper — `packages/react`

`src/components/<channel>-connect-button/Default<Channel>ConnectButton.tsx` (copy Telegram's):

```tsx
import { DiscordConnectButtonProps } from '@novu/js/ui';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type DefaultDiscordConnectButtonProps = Pick<
  DiscordConnectButtonProps,
  | 'integrationIdentifier'
  | 'subscriberId'
  | 'onConnectSuccess'
  | 'onConnectError'
  | 'onDisconnectSuccess'
  | 'onDisconnectError'
  | 'connectLabel'
  | 'connectedLabel'
>;

export const DefaultDiscordConnectButton = (props: DefaultDiscordConnectButtonProps) => {
  const { novuUI } = useNovuUI();

  const mount = useCallback(
    (element: HTMLElement) =>
      novuUI.mountComponent({
        name: 'DiscordConnectButton', // MUST match novuComponents key
        props: { ...props },
        element,
      }),
    [novuUI, props]
  );

  return <Mounter mount={mount} />;
};
```

`src/components/<channel>-connect-button/<Channel>ConnectButton.tsx` (copy Telegram's):

```tsx
import React, { useMemo } from 'react';
import { useNovu } from '../../hooks/NovuProvider';
import { NovuUI, NovuUIOptions } from '../NovuUI';
import { withRenderer } from '../Renderer';
import { DefaultDiscordConnectButton, DefaultDiscordConnectButtonProps } from './DefaultDiscordConnectButton';

export type DiscordConnectButtonProps = DefaultDiscordConnectButtonProps &
  Pick<NovuUIOptions, 'container' | 'appearance'>;

const DiscordConnectButtonInternal = withRenderer<DiscordConnectButtonProps>((props) => {
  const { container, appearance, ...defaultProps } = props;
  const novu = useNovu();
  const options: NovuUIOptions = useMemo(
    () => ({ container, appearance, options: novu.options }),
    [container, appearance, novu.options]
  );

  return (
    <NovuUI options={options} novu={novu}>
      <DefaultDiscordConnectButton {...defaultProps} />
    </NovuUI>
  );
});

DiscordConnectButtonInternal.displayName = 'DiscordConnectButtonInternal';

export const DiscordConnectButton = React.memo((props: DiscordConnectButtonProps) => {
  return <DiscordConnectButtonInternal {...props} />;
});

DiscordConnectButton.displayName = 'DiscordConnectButton';
```

`src/components/index.ts`:

```ts
export * from './discord-connect-button/DiscordConnectButton';
```

`src/index.ts` — add to both blocks:

```ts
export type { /* ... */ DiscordConnectButtonProps } from './components';
export { /* ... */ DiscordConnectButton } from './components';
```

---

## 5. Worked example — Discord (endpoint model)

```
Decision: bot deep-link, no workspace OAuth → endpoint-based (like Telegram).

Create:
  packages/js/src/ui/icons/DiscordColored.tsx
  packages/js/src/ui/api/hooks/useDiscordConnection.ts
  packages/js/src/ui/components/discord-connect-button/DiscordConnectButton.tsx
  packages/react/src/components/discord-connect-button/DefaultDiscordConnectButton.tsx
  packages/react/src/components/discord-connect-button/DiscordConnectButton.tsx
Edit:
  packages/js/src/ui/components/Renderer.tsx           (+import, +novuComponents, +CHANNEL_COMPONENTS)
  packages/js/src/ui/components/index.ts               (+export)
  packages/js/src/ui/index.ts                          (+DiscordConnectButtonProps type)
  packages/react/src/components/index.ts               (+export)
  packages/react/src/index.ts                          (+component, +props type)
Then: pnpm build → wire into playground/nextjs → connect/disconnect test.
```

For a Discord **OAuth/app-install** flow instead, switch to the connection model: drop the
custom hook, reuse `useChannelConnection`, add `connectionIdentifier`/`context`/`scope`/
`connectionMode`/`autoLinkUser` props, add `DEFAULT_DISCORD_CONNECTION_IDENTIFIER` to
`constants.ts`, and poll `channelConnections.get(...)`.
