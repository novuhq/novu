import { createEffect, createMemo, createSignal, onCleanup, Show } from 'solid-js';
import type { ConnectionMode } from '../../../channel-connections/types';
import type { Context } from '../../../types';
import { useChannelConnection } from '../../api/hooks/useChannelConnection';
import { useNovu } from '../../context';
import { useStyle } from '../../helpers/useStyle';
import { CheckCircleFill } from '../../icons/CheckCircleFill';
import { Loader } from '../../icons/Loader';
import { MsTeamsColored } from '../../icons/MsTeamsColored';
import type { ChannelConnectButtonAppearanceCallback } from '../../types';
import { buildDefaultConnectionIdentifier, DEFAULT_MSTEAMS_CONNECTION_IDENTIFIER } from '../constants';
import { Button, Motion } from '../primitives';
import { Tooltip } from '../primitives/Tooltip';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';

export type MsTeamsConnectButtonProps = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId?: string;
  context?: Context;
  scope?: string[];
  connectionMode?: ConnectionMode;
  /**
   * When true (default), after the admin consent step completes the OAuth flow automatically
   * chains into a delegated user-identity step, linking the subscriber who clicked "Connect"
   * as a personal MS Teams endpoint in the same popup window.
   * Set to false to perform only the tenant-level admin consent without linking the user.
   */
  autoLinkUser?: boolean;
  onConnectSuccess?: (connectionIdentifier: string) => void;
  onConnectError?: (error: unknown) => void;
  onDisconnectSuccess?: () => void;
  onDisconnectError?: (error: unknown) => void;
  connectLabel?: string;
  connectedLabel?: string;
};

const POLL_INITIAL_INTERVAL_MS = 2_500; // 2.5 seconds
const POLL_MAX_INTERVAL_MS = 30_000; // 30 seconds
const POLL_BACKOFF_FACTOR = 1.5;
const POLL_TIMEOUT_MS = 300_000; // 5 minutes

export const MsTeamsConnectButton = (props: MsTeamsConnectButtonProps) => {
  const style = useStyle();
  const novuAccessor = useNovu();
  const integrationIdentifier = () => props.integrationIdentifier;
  const connectionMode = () => props.connectionMode ?? 'subscriber';
  const resolvedContext = () => props.context ?? novuAccessor().context;
  const resolvedSubscriberId = () =>
    connectionMode() === 'subscriber' ? (props.subscriberId ?? novuAccessor().subscriberId) : undefined;
  const connectionIdentifier = () =>
    props.connectionIdentifier ??
    buildDefaultConnectionIdentifier(DEFAULT_MSTEAMS_CONNECTION_IDENTIFIER, resolvedSubscriberId());

  const { connection, loading, disconnect, mutate, generateConnectOAuthUrl } = useChannelConnection({
    integrationIdentifier: integrationIdentifier(),
    connectionIdentifier: connectionIdentifier(),
    subscriberId: props.subscriberId,
  });

  const [actionLoading, setActionLoading] = createSignal(false);

  const isMisconfigured = createMemo(() => connectionMode() === 'shared' && !resolvedContext());

  createEffect(() => {
    if (isMisconfigured()) {
      console.warn(
        '[Novu] MsTeamsConnectButton: "context" is required when connectionMode is "shared". ' +
          'Provide it via the context prop on MsTeamsConnectButton or on NovuProvider.'
      );
    }
  });

  const isConnected = () => !!connection();
  const isLoading = () => loading() || actionLoading();

  const timeoutIdRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };

  onCleanup(() => {
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  });

  const startPolling = () => {
    const connId = connectionIdentifier();

    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    const startedAt = Date.now();

    const schedulePoll = (intervalMs: number) => {
      timeoutIdRef.current = setTimeout(async () => {
        try {
          const response = await novuAccessor().channelConnections.get({
            identifier: connId,
          });

          if (response.data) {
            timeoutIdRef.current = null;
            setActionLoading(false);
            mutate(response.data);
            props.onConnectSuccess?.(connId);

            return;
          }
        } catch {
          // ignore transient errors during polling
        }

        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          timeoutIdRef.current = null;
          setActionLoading(false);
          props.onConnectError?.(new Error('MS Teams OAuth timed out. Please try again.'));

          return;
        }

        const nextInterval = Math.min(intervalMs * POLL_BACKOFF_FACTOR, POLL_MAX_INTERVAL_MS);
        schedulePoll(nextInterval);
      }, intervalMs);
    };

    schedulePoll(POLL_INITIAL_INTERVAL_MS);
  };

  const handleClick = async () => {
    if (isConnected()) {
      const identifier = connection()?.identifier;
      if (!identifier) return;

      const result = await disconnect(identifier);
      if (result.error) {
        props.onDisconnectError?.(result.error);
      } else {
        props.onDisconnectSuccess?.();
      }
    } else {
      setActionLoading(true);

      const mode = connectionMode();
      const ctx = resolvedContext();
      const resolvedSubscriberId =
        mode === 'subscriber' ? (props.subscriberId ?? novuAccessor().subscriberId) : undefined;

      const result = await generateConnectOAuthUrl({
        integrationIdentifier: integrationIdentifier(),
        connectionIdentifier: connectionIdentifier(),
        subscriberId: resolvedSubscriberId,
        context: ctx,
        scope: props.scope,
        connectionMode: mode,
        autoLinkUser: mode === 'subscriber' ? (props.autoLinkUser ?? true) : false,
      });

      if (result.error) {
        setActionLoading(false);
        props.onConnectError?.(result.error);

        return;
      }

      if (result.data?.url) {
        window.open(result.data.url, '_blank', 'noopener,noreferrer');
        startPolling();
      } else {
        setActionLoading(false);
        props.onConnectError?.(new Error('OAuth URL was not returned. Please try again.'));
      }
    }
  };

  const buttonContent = () => (
    <span
      class={style({
        key: 'channelConnectButtonInner',
        className: 'nt-relative nt-overflow-hidden nt-inline-flex nt-items-center nt-justify-center nt-gap-1',
        context: { connected: isConnected() } satisfies Parameters<
          ChannelConnectButtonAppearanceCallback['channelConnectButtonInner']
        >[0],
      })}
    >
      <Motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: actionLoading() ? 0 : 1 }}
        transition={{ easing: 'ease-in-out', duration: 0.2 }}
        class="nt-inline-flex nt-items-center nt-gap-1"
      >
        {isConnected() ? (
          <IconRendererWrapper
            iconKey="channelConnected"
            class={style({
              key: 'channelConnectButtonIcon',
              className:
                'nt-inline-flex nt-items-center nt-justify-center nt-size-4 nt-shrink-0 nt-rounded-full nt-bg-white nt-shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]',
              iconKey: 'channelConnected',
              context: { connected: true } satisfies Parameters<
                ChannelConnectButtonAppearanceCallback['channelConnectButtonIcon']
              >[0],
            })}
            fallback={
              <span
                class={style({
                  key: 'channelConnectButtonIcon',
                  className:
                    'nt-inline-flex nt-items-center nt-justify-center nt-size-4 nt-shrink-0 nt-rounded-full nt-bg-white nt-shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]',
                  iconKey: 'channelConnected',
                  context: { connected: true } satisfies Parameters<
                    ChannelConnectButtonAppearanceCallback['channelConnectButtonIcon']
                  >[0],
                })}
              >
                <CheckCircleFill class="nt-size-full" />
              </span>
            }
          />
        ) : (
          <IconRendererWrapper
            iconKey="channelConnect"
            class={style({
              key: 'channelConnectButtonIcon',
              className: 'nt-size-4 nt-shrink-0',
              iconKey: 'channelConnect',
              context: { connected: false } satisfies Parameters<
                ChannelConnectButtonAppearanceCallback['channelConnectButtonIcon']
              >[0],
            })}
            fallback={
              <MsTeamsColored
                class={style({
                  key: 'channelConnectButtonIcon',
                  className: 'nt-size-4 nt-shrink-0',
                  iconKey: 'channelConnect',
                  context: { connected: false } satisfies Parameters<
                    ChannelConnectButtonAppearanceCallback['channelConnectButtonIcon']
                  >[0],
                })}
              />
            }
          />
        )}
        <span
          class={style({
            key: 'channelConnectButtonLabel',
            className: '[line-height:16px]',
            context: { connected: isConnected() } satisfies Parameters<
              ChannelConnectButtonAppearanceCallback['channelConnectButtonLabel']
            >[0],
          })}
        >
          {isConnected() ? (props.connectedLabel ?? 'Connected') : (props.connectLabel ?? 'Connect MS Teams')}
        </span>
      </Motion.span>
      <Motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: actionLoading() ? 1 : 0 }}
        transition={{ easing: 'ease-in-out', duration: 0.2 }}
        class="nt-absolute nt-left-0 nt-inline-flex nt-items-center"
      >
        <Loader class="nt-text-foreground-alpha-600 nt-size-3.5 nt-animate-spin" />
      </Motion.span>
    </span>
  );

  return (
    <Show when={!loading()} fallback={<Loader class="nt-text-foreground-alpha-600 nt-size-4 nt-animate-spin" />}>
      <div
        class={style({
          key: 'channelConnectButtonContainer',
          className: 'nt-flex nt-items-center nt-gap-2',
          context: { connected: isConnected() } satisfies Parameters<
            ChannelConnectButtonAppearanceCallback['channelConnectButtonContainer']
          >[0],
        })}
      >
        <Show
          when={!isMisconfigured()}
          fallback={
            <Tooltip.Root>
              <Tooltip.Trigger
                asChild={(triggerProps) => (
                  <Button
                    class={style({
                      key: 'channelConnectButton',
                      className: 'nt-transition-[width] nt-duration-800 nt-will-change-[width] !nt-pointer-events-auto',
                      context: { connected: false } satisfies Parameters<
                        ChannelConnectButtonAppearanceCallback['channelConnectButton']
                      >[0],
                    })}
                    variant="secondary"
                    disabled={true}
                    {...triggerProps}
                  >
                    {buttonContent()}
                  </Button>
                )}
              />
              <Tooltip.Content
                class={style({
                  key: 'channelConnectButtonMisconfiguredTooltip',
                  className:
                    'nt-bg-foreground nt-p-2 nt-shadow-tooltip nt-rounded-lg nt-text-background nt-text-xs nt-max-w-[220px]',
                })}
              >
                Missing context — provide a <code>context</code> prop on <code>MsTeamsConnectButton</code> or{' '}
                <code>NovuProvider</code> when using <code>connectionMode="shared"</code>
              </Tooltip.Content>
            </Tooltip.Root>
          }
        >
          <Button
            class={style({
              key: 'channelConnectButton',
              className: 'nt-transition-[width] nt-duration-800 nt-will-change-[width]',
              context: { connected: isConnected() } satisfies Parameters<
                ChannelConnectButtonAppearanceCallback['channelConnectButton']
              >[0],
            })}
            variant="secondary"
            onClick={handleClick}
            disabled={isLoading()}
          >
            {buttonContent()}
          </Button>
        </Show>
      </div>
    </Show>
  );
};
