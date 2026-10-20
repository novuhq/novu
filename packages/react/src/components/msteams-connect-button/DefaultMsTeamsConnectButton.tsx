import { MsTeamsConnectButtonProps } from '@novu/js/ui';
import { useMemo } from 'react';
import { Mounter } from '../Mounter';

export type DefaultMsTeamsConnectButtonProps = Pick<
  MsTeamsConnectButtonProps,
  | 'integrationIdentifier'
  | 'connectionIdentifier'
  | 'subscriberId'
  | 'context'
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

export const DefaultMsTeamsConnectButton = (props: DefaultMsTeamsConnectButtonProps) => {
  const {
    integrationIdentifier,
    connectionIdentifier,
    subscriberId,
    context,
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

  return <Mounter name="MsTeamsConnectButton" props={mountProps} />;
};
