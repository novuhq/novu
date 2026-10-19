import { ConnectChatProps } from '@novu/js/ui';
import { useMemo } from 'react';
import { Mounter } from '../Mounter';

export type DefaultConnectChatProps = Pick<
  ConnectChatProps,
  | 'integrationIdentifier'
  | 'connectionIdentifier'
  | 'subscriberId'
  | 'context'
  | 'scope'
  | 'connectionMode'
  | 'onConnectSuccess'
  | 'onConnectError'
  | 'onDisconnectSuccess'
  | 'onDisconnectError'
>;

export const DefaultConnectChat = (props: DefaultConnectChatProps) => {
  const {
    integrationIdentifier,
    connectionIdentifier,
    subscriberId,
    context,
    scope,
    connectionMode,
    onConnectSuccess,
    onConnectError,
    onDisconnectSuccess,
    onDisconnectError,
  } = props;

  const mountProps = useMemo(
    () => ({
      integrationIdentifier,
      connectionIdentifier,
      subscriberId,
      context,
      scope,
      connectionMode,
      onConnectSuccess,
      onConnectError,
      onDisconnectSuccess,
      onDisconnectError,
    }),
    [
      integrationIdentifier,
      connectionIdentifier,
      subscriberId,
      context,
      scope,
      connectionMode,
      onConnectSuccess,
      onConnectError,
      onDisconnectSuccess,
      onDisconnectError,
    ]
  );

  return <Mounter name="ConnectChat" props={mountProps} />;
};
