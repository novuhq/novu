import { TelegramConnectButtonProps } from '@novu/js/ui';
import { useCallback } from 'react';
import { useNovuUI } from '../../context/NovuUIContext';
import { Mounter } from '../Mounter';

export type DefaultTelegramConnectButtonProps = Pick<
  TelegramConnectButtonProps,
  | 'integrationIdentifier'
  | 'subscriberId'
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
        name: 'TelegramConnectButton',
        props: {
          integrationIdentifier,
          subscriberId,
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
      subscriberId,
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
