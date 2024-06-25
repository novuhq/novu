import { Tooltip } from '@novu/design-system';
import { Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconEdit, IconLink, IconLinkOff } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { useQuery } from '@tanstack/react-query';
import { FC, useState } from 'react';
import { useHover } from '../../../../hooks/useHover';
import { useBridgeUrl } from '../../../../studio/utils/useBridgeUrl';
import { BridgeUpdateModal } from './BridgeUpdateModal';
import { ConnectionStatus, ConnectionStatusIndicator } from './ConnectionStatusIndicator';

type BridgeStatus = {
  status: ConnectionStatus;
  bridgeUrl?: string;
};

const BRIDGE_STATUS_REFRESH_INTERVAL_MS = 5 * 1000;

const useBridgeStatus = () => {
  const { bridgeUrl, isLoading: isLoadingEnvironment } = useBridgeUrl();

  const { data, isLoading, refetch } = useQuery<BridgeStatus>({
    queryKey: ['bridge-status', bridgeUrl],
    refetchInterval: BRIDGE_STATUS_REFRESH_INTERVAL_MS,
    enabled: Boolean(isLoadingEnvironment),
    queryFn: async () => {
      if (!bridgeUrl) {
        return { status: 'disconnected' as ConnectionStatus };
      }

      try {
        new URL(bridgeUrl);
      } catch (e) {
        throw new Error('The provided URL is invalid');
      }

      try {
        const response = await fetch(bridgeUrl + '?action=health-check', {
          headers: {
            'Bypass-Tunnel-Reminder': 'true',
          },
        });

        const resp = await response.json();

        return { status: (resp.status === 'ok' ? 'connected' : 'disconnected') as ConnectionStatus, bridgeUrl };
      } catch (e: any) {
        return { status: 'disconnected' as ConnectionStatus, bridgeUrl };
      }
    },
  });

  return {
    data: data ?? { status: 'loading', bridgeUrl },
    isLoading: isLoading || isLoadingEnvironment,
    refetch,
  };
};

export const BridgeUpdateModalTrigger: FC = () => {
  const hoverProps = useHover();
  const [showBridgeUpdateModal, setShowBridgeUpdateModal] = useState<boolean>(false);
  const {
    data: { status, bridgeUrl },
  } = useBridgeStatus();

  const toggleBridgeUpdateModalShow = () => {
    setShowBridgeUpdateModal((previous) => !previous);
  };

  return (
    <>
      <BridgeUpdateModalTriggerControl
        status={status}
        bridgeUrl={bridgeUrl}
        onClick={toggleBridgeUpdateModalShow}
        {...hoverProps}
      />
      <BridgeUpdateModal isOpen={showBridgeUpdateModal} toggleOpen={toggleBridgeUpdateModalShow} />
    </>
  );
};

function BridgeUpdateModalTriggerControl({
  status,
  bridgeUrl,
  isHovered,
  ...buttonProps
}: {
  onClick: () => void;
} & BridgeStatus &
  ReturnType<typeof useHover>) {
  const trigger = isHovered ? (
    <button {...buttonProps} className={css({ '&, & svg': { color: 'typography.text.main !important' } })}>
      <HStack gap="25">
        <IconEdit className={css({ color: 'icon.main' })} size="16" />
        <Text>Edit endpoint</Text>
      </HStack>
    </button>
  ) : (
    <ConnectionStatusIndicator status={status} {...buttonProps} />
  );

  switch (status) {
    case 'loading':
      return <Tooltip label="Trying to connect to Bridge URL">{trigger}</Tooltip>;
    case 'connected':
      return (
        <Tooltip
          label={
            <HStack>
              <IconLink />
              <Text maxWidth={'[27rem]'} textWrap="wrap">{`Connected to ${bridgeUrl}`}</Text>
            </HStack>
          }
        >
          {trigger}
        </Tooltip>
      );
    case 'disconnected':
    default:
      return (
        <Tooltip
          label={
            <HStack>
              <IconLinkOff />
              <Text maxWidth={'[27rem]'} textWrap="wrap">
                {bridgeUrl ? `Unable to connect to ${bridgeUrl}` : `No Bridge URL configured`}
              </Text>
            </HStack>
          }
        >
          {trigger}
        </Tooltip>
      );
  }
}
