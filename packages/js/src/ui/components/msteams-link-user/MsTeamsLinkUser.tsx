import { createResource, createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { ChannelEndpointResponse } from '../../../channel-connections/types';
import type { Context } from '../../../types';
import { useChannelEndpoint } from '../../api/hooks/useChannelEndpoint';
import { useNovu } from '../../context';
import { useStyle } from '../../helpers/useStyle';
import { CheckCircleFill } from '../../icons/CheckCircleFill';
import { Loader } from '../../icons/Loader';
import { MsTeamsColored } from '../../icons/MsTeamsColored';
import type { MsTeamsLinkUserAppearanceCallback } from '../../types';
import { buildDefaultConnectionIdentifier, DEFAULT_MSTEAMS_CONNECTION_IDENTIFIER } from '../constants';
import { Button, Motion } from '../primitives';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';

export type MsTeamsLinkUserProps = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId?: string;
  context?: Context;
  onLinkSuccess?: (endpoint: { identifier: string }) => void;
  onLinkError?: (error: unknown) => void;
  onUnlinkSuccess?: () => void;
  onUnlinkError?: (error: unknown) => void;
  linkLabel?: string;
  unlinkLabel?: string;
};

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 120_000;

export const MsTeamsLinkUser = (props: MsTeamsLinkUserProps) => {
  const style = useStyle();
  const novuAccessor = useNovu();
  const integrationIdentifier = () => props.integrationIdentifier;
  const resolvedSubscriberId = () => props.subscriberId ?? novuAccessor().subscriberId;
  const connectionIdentifier = () =>
    props.connectionIdentifier ??
    buildDefaultConnectionIdentifier(DEFAULT_MSTEAMS_CONNECTION_IDENTIFIER, resolvedSubscriberId());

  const { generateLinkUserOAuthUrl } = useChannelEndpoint({
    integrationIdentifier: integrationIdentifier(),
    connectionIdentifier: connectionIdentifier(),
    subscriberId: props.subscriberId,
  });

  const [endpoint, setEndpoint] = createSignal<ChannelEndpointResponse | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal(false);

  let pollingIntervalId: ReturnType<typeof setInterval> | undefined;

  onCleanup(() => {
    clearInterval(pollingIntervalId);
  });

  const isLinked = () => !!endpoint();
  const isLoading = () => loading() || actionLoading();

  createResource(
    () => ({
      integrationIdentifier: integrationIdentifier(),
      connectionIdentifier: connectionIdentifier(),
    }),
    async ({ integrationIdentifier: intId, connectionIdentifier: connId }) => {
      setLoading(true);

      try {
        const response = await novuAccessor().channelEndpoints.list({
          integrationIdentifier: intId,
          connectionIdentifier: connId,
        });
        const existing = response.data?.find((ep) => ep.type === 'ms_teams_user') ?? null;
        setEndpoint(existing);
      } catch {
        setEndpoint(null);
      } finally {
        setLoading(false);
      }
    }
  );

  onMount(() => {
    const currentNovu = novuAccessor();

    const cleanupDelete = currentNovu.on('channel-endpoint.delete.resolved', ({ args }) => {
      if (args?.identifier && args.identifier === endpoint()?.identifier) {
        setEndpoint(null);
      }
    });

    onCleanup(() => {
      cleanupDelete();
    });
  });

  const startPolling = () => {
    const startedAt = Date.now();

    pollingIntervalId = setInterval(async () => {
      try {
        const response = await novuAccessor().channelEndpoints.list({
          integrationIdentifier: integrationIdentifier(),
          connectionIdentifier: connectionIdentifier(),
        });
        const found = response.data?.find((ep) => ep.type === 'ms_teams_user') ?? null;

        if (found) {
          clearInterval(pollingIntervalId);
          setActionLoading(false);
          setEndpoint(found);
          props.onLinkSuccess?.({ identifier: found.identifier });

          return;
        }
      } catch {
        // ignore transient errors during polling
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        clearInterval(pollingIntervalId);
        setActionLoading(false);
        props.onLinkError?.(new Error('MS Teams OAuth timed out. Please try again.'));
      }
    }, POLL_INTERVAL_MS);
  };

  const handleClick = async () => {
    if (isLinked()) {
      const identifier = endpoint()?.identifier;
      if (!identifier) return;

      setActionLoading(true);
      const result = await novuAccessor().channelEndpoints.delete({ identifier });
      setActionLoading(false);

      if (result.error) {
        props.onUnlinkError?.(result.error);
      } else {
        setEndpoint(null);
        props.onUnlinkSuccess?.();
      }
    } else {
      const resolvedSubscriberId = props.subscriberId ?? novuAccessor().subscriberId;
      if (!resolvedSubscriberId) {
        props.onLinkError?.(new Error('subscriberId is required to link an MS Teams user'));

        return;
      }

      setActionLoading(true);

      const result = await generateLinkUserOAuthUrl({
        integrationIdentifier: integrationIdentifier(),
        connectionIdentifier: connectionIdentifier(),
        subscriberId: resolvedSubscriberId,
        context: props.context,
      });

      if (result.error) {
        setActionLoading(false);
        props.onLinkError?.(result.error);

        return;
      }

      if (result.data?.url) {
        window.open(result.data.url, '_blank', 'noopener,noreferrer');
        startPolling();
      } else {
        setActionLoading(false);
        props.onLinkError?.(new Error('OAuth URL was not returned. Please try again.'));
      }
    }
  };

  return (
    <div
      class={style({
        key: 'linkMsTeamsUserContainer',
        className: 'nt-flex nt-items-center nt-gap-2',
        context: { linked: isLinked() } satisfies Parameters<
          MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserContainer']
        >[0],
      })}
    >
      <Button
        class={style({
          key: 'linkMsTeamsUserButton',
          className: 'nt-transition-[width] nt-duration-800 nt-will-change-[width]',
          context: { linked: isLinked() } satisfies Parameters<
            MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserButton']
          >[0],
        })}
        variant="secondary"
        onClick={handleClick}
        disabled={isLoading()}
      >
        <span
          class={style({
            key: 'linkMsTeamsUserButtonContainer',
            className: 'nt-relative nt-overflow-hidden nt-inline-flex nt-items-center nt-justify-center nt-gap-1',
            context: { linked: isLinked() } satisfies Parameters<
              MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserButtonContainer']
            >[0],
          })}
        >
          <Motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: isLoading() ? 0 : 1 }}
            transition={{ easing: 'ease-in-out', duration: 0.2 }}
            class="nt-inline-flex nt-items-center nt-gap-1"
          >
            <Show
              when={isLinked()}
              fallback={
                <IconRendererWrapper
                  iconKey="channelConnect"
                  class={style({
                    key: 'linkMsTeamsUserButtonIcon',
                    className: 'nt-size-4 nt-shrink-0',
                    iconKey: 'channelConnect',
                    context: { linked: false } satisfies Parameters<
                      MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserButtonIcon']
                    >[0],
                  })}
                  fallback={
                    <MsTeamsColored
                      class={style({
                        key: 'linkMsTeamsUserButtonIcon',
                        className: 'nt-size-4 nt-shrink-0',
                        iconKey: 'channelConnect',
                        context: { linked: false } satisfies Parameters<
                          MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserButtonIcon']
                        >[0],
                      })}
                    />
                  }
                />
              }
            >
              <IconRendererWrapper
                iconKey="channelConnected"
                class={style({
                  key: 'linkMsTeamsUserButtonIcon',
                  className:
                    'nt-inline-flex nt-items-center nt-justify-center nt-size-4 nt-shrink-0 nt-rounded-full nt-bg-white nt-shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]',
                  iconKey: 'channelConnected',
                  context: { linked: true } satisfies Parameters<
                    MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserButtonIcon']
                  >[0],
                })}
                fallback={
                  <span
                    class={style({
                      key: 'linkMsTeamsUserButtonIcon',
                      className:
                        'nt-inline-flex nt-items-center nt-justify-center nt-size-4 nt-shrink-0 nt-rounded-full nt-bg-white nt-shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]',
                      iconKey: 'channelConnected',
                      context: { linked: true } satisfies Parameters<
                        MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserButtonIcon']
                      >[0],
                    })}
                  >
                    <CheckCircleFill class="nt-size-full" />
                  </span>
                }
              />
            </Show>
            <span
              class={style({
                key: 'linkMsTeamsUserButtonLabel',
                className: '[line-height:16px]',
                context: { linked: isLinked() } satisfies Parameters<
                  MsTeamsLinkUserAppearanceCallback['linkMsTeamsUserButtonLabel']
                >[0],
              })}
            >
              {isLinked() ? (props.unlinkLabel ?? 'Unlink') : (props.linkLabel ?? 'Link Teams User')}
            </span>
          </Motion.span>
          <Motion.span
            initial={{ opacity: 1 }}
            animate={{ opacity: isLoading() ? 1 : 0 }}
            transition={{ easing: 'ease-in-out', duration: 0.2 }}
            class="nt-absolute nt-left-0 nt-inline-flex nt-items-center"
          >
            <Loader class="nt-text-foreground-alpha-600 nt-size-3.5 nt-animate-spin" />
          </Motion.span>
        </span>
      </Button>
    </div>
  );
};
