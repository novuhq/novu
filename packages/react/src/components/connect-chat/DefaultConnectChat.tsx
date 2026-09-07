import { ConnectChatProps } from '@novu/js/ui';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
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
  const { novuUI } = useNovuUI();

  const mount = useCallback(
    (element: HTMLElement) => {
      return novuUI.mountComponent({
        name: 'ConnectChat',
        props: {
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
      onConnectSuccess,
      onConnectError,
      onDisconnectSuccess,
      onDisconnectError,
    ]
  );

  return <Mounter mount={mount} />;
};
