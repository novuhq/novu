import { TelegramConnectButtonProps } from '@novu/js/ui';
import { useMemo } from 'react';
import { Mounter } from '../Mounter';

export type DefaultTelegramConnectButtonProps = Pick<
  TelegramConnectButtonProps,
  | 'integrationIdentifier'
  | 'subscriberId'
  | 'context'
  | 'contextHash'
  | 'onConnectSuccess'
  | 'onConnectError'
  | 'onDisconnectSuccess'
  | 'onDisconnectError'
  | 'connectLabel'
  | 'connectedLabel'
>;

export const DefaultTelegramConnectButton = (props: DefaultTelegramConnectButtonProps) => {
  const {
    integrationIdentifier,
    subscriberId,
    context,
    contextHash,
    onConnectSuccess,
    onConnectError,
    onDisconnectSuccess,
    onDisconnectError,
    connectLabel,
    connectedLabel,
  } = props;

  const mountProps = useMemo(
    () => ({
      integrationIdentifier,
      subscriberId,
      context,
      contextHash,
      onConnectSuccess,
      onConnectError,
      onDisconnectSuccess,
      onDisconnectError,
      connectLabel,
      connectedLabel,
    }),
    [
      integrationIdentifier,
      subscriberId,
      context,
      contextHash,
      onConnectSuccess,
      onConnectError,
      onDisconnectSuccess,
      onDisconnectError,
      connectLabel,
      connectedLabel,
    ]
  );

  return <Mounter name="TelegramConnectButton" props={mountProps} />;
};
