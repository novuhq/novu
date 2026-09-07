import { createEffect, createMemo, Show } from 'solid-js';
import type { ConnectionMode } from '../../../channel-connections/types';
import type { Context } from '../../../types';
import { useChannelConnection } from '../../api/hooks/useChannelConnection';
import { useNovu } from '../../context';
import { useStyle } from '../../helpers/useStyle';
import { Loader } from '../../icons/Loader';
import { Button, Motion } from '../primitives';
import { Tooltip } from '../primitives/Tooltip';

export type ConnectChatProps = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId?: string;
  context?: Context;
  scope?: string[];
  connectionMode?: ConnectionMode;
  onConnectSuccess?: (connectionIdentifier: string) => void;
  onConnectError?: (error: unknown) => void;
  onDisconnectSuccess?: () => void;
  onDisconnectError?: (error: unknown) => void;
};

export const ConnectChat = (props: ConnectChatProps) => {
  const style = useStyle();
  const novuAccessor = useNovu();
  const {
    connection,
    loading,
    generateConnectOAuthUrl: connect,
    disconnect,
  } = useChannelConnection({
    integrationIdentifier: props.integrationIdentifier,
    connectionIdentifier: props.connectionIdentifier,
    subscriberId: props.subscriberId,
  });

  const connectionMode = () => props.connectionMode ?? 'subscriber';
  const resolvedContext = () => props.context ?? novuAccessor().context;
  const isMisconfigured = createMemo(() => connectionMode() === 'shared' && !resolvedContext());

  createEffect(() => {
    if (isMisconfigured()) {
      console.warn(
        '[Novu] ConnectChat: "context" is required when connectionMode is "shared". ' +
          'Provide it via the context prop on ConnectChat or on NovuProvider.'
      );
    }
  });

  const isConnected = () => !!connection();

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
      const mode = connectionMode();
      const ctx = resolvedContext();
      const resolvedSubscriberId =
        mode === 'subscriber' ? (props.subscriberId ?? novuAccessor().subscriberId) : undefined;

      const result = await connect({
        integrationIdentifier: props.integrationIdentifier,
        connectionIdentifier: props.connectionIdentifier,
        subscriberId: resolvedSubscriberId,
        context: ctx,
        scope: props.scope,
        connectionMode: mode,
      });

      if (result.error) {
        props.onConnectError?.(result.error);
      } else if (result.data?.url) {
        window.open(result.data.url, '_blank', 'noopener,noreferrer');
        if (props.connectionIdentifier) {
          props.onConnectSuccess?.(props.connectionIdentifier);
        }
      }
    }
  };

  const buttonContent = () => (
    <span
      class={style({
        key: 'connectChatButtonContainer',
        className: 'nt-relative nt-overflow-hidden nt-inline-flex nt-items-center nt-justify-center nt-gap-1',
      })}
    >
      <Motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: loading() ? 0 : 1 }}
        transition={{ easing: 'ease-in-out', duration: 0.2 }}
        class="nt-inline-flex nt-items-center"
      >
        <span
          class={style({
            key: 'connectChatButtonLabel',
            className: '[line-height:16px]',
          })}
        >
          {isConnected() ? 'Disconnect' : 'Connect'}
        </span>
      </Motion.span>
      <Motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: loading() ? 1 : 0 }}
        transition={{ easing: 'ease-in-out', duration: 0.2 }}
        class="nt-absolute nt-left-0 nt-inline-flex nt-items-center"
      >
        <Loader class="nt-text-foreground-alpha-600 nt-size-3.5 nt-animate-spin" />
      </Motion.span>
    </span>
  );

  return (
    <div
      class={style({
        key: 'connectChatContainer',
        className: 'nt-flex nt-items-center nt-gap-2',
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
                    key: 'connectChatButton',
                    className: 'nt-transition-[width] nt-duration-800 nt-will-change-[width] !nt-pointer-events-auto',
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
                key: 'connectChatMisconfiguredTooltip',
                className:
                  'nt-bg-foreground nt-p-2 nt-shadow-tooltip nt-rounded-lg nt-text-background nt-text-xs nt-max-w-[220px]',
              })}
            >
              Missing context — provide a <code>context</code> prop on <code>ConnectChat</code> or{' '}
              <code>NovuProvider</code> when using <code>connectionMode="shared"</code>
            </Tooltip.Content>
          </Tooltip.Root>
        }
      >
        <Button
          class={style({
            key: 'connectChatButton',
            className: 'nt-transition-[width] nt-duration-800 nt-will-change-[width]',
          })}
          variant="secondary"
          onClick={handleClick}
          disabled={loading()}
        >
          {buttonContent()}
        </Button>
      </Show>
    </div>
  );
};
