import { SlackConnectButtonProps } from '@novu/js/ui';
import { useMemo } from 'react';
import { Mounter } from '../Mounter';

export type DefaultSlackConnectButtonProps = Pick<
  SlackConnectButtonProps,
  | 'integrationIdentifier'
  | 'connectionIdentifier'
  | 'subscriberId'
  | 'context'
  | 'contextHash'
  | 'scope'
  | 'connectionMode'
  | 'autoLinkUser'
  | 'onConnectSuccess'
  | 'onConnectError'
  | 'onDisconnectSuccess'
  | 'onDisconnectError'
  | 'connectLabel'
  | 'connectedLabel'
>;

export const DefaultSlackConnectButton = (props: DefaultSlackConnectButtonProps) => {
  const {
    integrationIdentifier,
    connectionIdentifier,
    subscriberId,
    context,
    contextHash,
    scope,
    connectionMode,
    autoLinkUser,
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
      connectionIdentifier,
      subscriberId,
      context,
      contextHash,
      scope,
      connectionMode,
      autoLinkUser,
      onConnectSuccess,
      onConnectError,
      onDisconnectSuccess,
      onDisconnectError,
      connectLabel,
      connectedLabel,
    }),
    [
      integrationIdentifier,
      connectionIdentifier,
      subscriberId,
      context,
      contextHash,
      scope,
      connectionMode,
      autoLinkUser,
      onConnectSuccess,
      onConnectError,
      onDisconnectSuccess,
      onDisconnectError,
      connectLabel,
      connectedLabel,
    ]
  );

  return <Mounter name="SlackConnectButton" props={mountProps} />;
};
