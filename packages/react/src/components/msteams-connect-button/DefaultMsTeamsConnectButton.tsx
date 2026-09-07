import { MsTeamsConnectButtonProps } from '@novu/js/ui';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
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
  const { novuUI } = useNovuUI();

  const mount = useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'MsTeamsConnectButton',
        props: {
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
        },
        element,
      });
    },
    [
      novuUI,
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

  return <Mounter mount={mount} />;
};
