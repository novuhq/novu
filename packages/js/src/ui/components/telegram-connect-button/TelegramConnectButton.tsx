import { createSignal, onCleanup, Show } from 'solid-js';
import { useTelegramConnection } from '../../api/hooks/useTelegramConnection';
import { useNovu } from '../../context';
import { useStyle } from '../../helpers/useStyle';
import { CheckCircleFill } from '../../icons/CheckCircleFill';
import { Loader } from '../../icons/Loader';
import { TelegramColored } from '../../icons/TelegramColored';
import type { ChannelConnectButtonAppearanceCallback } from '../../types';
import { Button, Motion } from '../primitives';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';

export type TelegramConnectButtonProps = {
  integrationIdentifier: string;
  subscriberId?: string;
  onConnectSuccess?: (endpointIdentifier: string) => void;
  onConnectError?: (error: unknown) => void;
  onDisconnectSuccess?: () => void;
  onDisconnectError?: (error: unknown) => void;
  connectLabel?: string;
  connectedLabel?: string;
};

const TELEGRAM_PROVIDER_ID = 'telegram';
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 120_000;

export const TelegramConnectButton = (props: TelegramConnectButtonProps) => {
  const style = useStyle();
  const novuAccessor = useNovu();
  const integrationIdentifier = () => props.integrationIdentifier;
  const resolvedSubscriberId = () => props.subscriberId ?? novuAccessor().subscriberId;

  const { endpoint, loading, disconnect, mutate, link } = useTelegramConnection({
    integrationIdentifier: integrationIdentifier(),
    subscriberId: props.subscriberId,
  });

  const [actionLoading, setActionLoading] = createSignal(false);

  const isConnected = () => !!endpoint();
  const isLoading = () => loading() || actionLoading();

  const intervalIdRef: { current: ReturnType<typeof setInterval> | null } = { current: null };

  const stopPolling = () => {
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  onCleanup(stopPolling);

  const startPolling = () => {
    stopPolling();

    const startedAt = Date.now();
    // `setInterval` does not serialize async callbacks: if a `list()` call outlives POLL_INTERVAL_MS,
    // a second tick fires while the first is still awaiting. This one-shot guard ensures only the
    // first callback to find the endpoint (or hit the timeout) runs the success/error side-effects.
    let committed = false;

    intervalIdRef.current = setInterval(async () => {
      if (committed) {
        return;
      }

      try {
        const response = await novuAccessor().channelEndpoints.list({
          integrationIdentifier: integrationIdentifier(),
          providerId: TELEGRAM_PROVIDER_ID,
          subscriberId: resolvedSubscriberId(),
          limit: 1,
        });

        if (committed) {
          return;
        }

        const found = response.data?.[0];
        if (found) {
          committed = true;
          stopPolling();
          setActionLoading(false);
          mutate(found);
          props.onConnectSuccess?.(found.identifier);

          return;
        }
      } catch {
        // ignore transient errors during polling
      }

      if (committed) {
        return;
      }

      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        committed = true;
        stopPolling();
        setActionLoading(false);
        props.onConnectError?.(new Error('Telegram connection timed out. Please try again.'));
      }
    }, POLL_INTERVAL_MS);
  };

  const handleClick = async () => {
    if (isConnected()) {
      const identifier = endpoint()?.identifier;
      if (!identifier) return;

      const result = await disconnect(identifier);
      if (result.error) {
        props.onDisconnectError?.(result.error);
      } else {
        props.onDisconnectSuccess?.();
      }
    } else {
      setActionLoading(true);

      const result = await link({
        integrationIdentifier: integrationIdentifier(),
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
        props.onConnectError?.(new Error('Telegram link URL was not returned. Please try again.'));
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
              <TelegramColored
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
          {isConnected()
            ? (props.connectedLabel ?? 'Connected to Telegram')
            : (props.connectLabel ?? 'Connect Telegram')}
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
      </div>
    </Show>
  );
};
