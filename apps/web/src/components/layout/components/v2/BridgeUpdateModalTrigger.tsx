import { Tooltip } from '@novu/design-system';
import { Button, Text } from '@novu/novui';
import { IconEdit, IconLink } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { BridgeUpdateModal } from './BridgeUpdateModal';
import { ConnectionStatus, ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { getBridgeUrl } from './utils';

// FIXME: figure out what this status actually represents
type BridgeConnectionStatus = ConnectionStatus | 'todo';

/**
 * FIXME: Implement this helper -- determine what are the inputs to determine the status.
 * Gets the bridge connection status based on environment state and connection info.
 */
const selectBridgeStatus = (): BridgeConnectionStatus => {
  return 'todo';
};

export const BridgeUpdateModalTrigger: FC = () => {
  const location = useLocation();
  const { environment, isLoading: isLoadingEnvironment } = useEnvironment();
  const [showBridgeUpdateModal, setShowBridgeUpdateModal] = useState<boolean>(false);

  const toggleBridgeUpdateModalShow = () => {
    setShowBridgeUpdateModal((previous) => !previous);
  };

  if (isLoadingEnvironment) {
    // FIXME: what should be shown here?
    return (
      <Tooltip label={<Text>Getting endpoint information...</Text>}>
        <Text>Loading...</Text>
      </Tooltip>
    );
  }

  const bridgeStatus = selectBridgeStatus();
  const bridgeUrl = getBridgeUrl(environment, location.pathname);

  return (
    <>
      <BridgeUpdateModalTriggerControl
        status={bridgeStatus}
        bridgeUrl={bridgeUrl}
        onClick={toggleBridgeUpdateModalShow}
      />
      <BridgeUpdateModal isOpen={showBridgeUpdateModal} toggleOpen={toggleBridgeUpdateModalShow} />
    </>
  );
};

function BridgeUpdateModalTriggerControl({
  status,
  onClick,
  bridgeUrl,
}: {
  status: BridgeConnectionStatus;
  onClick: () => void;
  bridgeUrl?: string | null;
}) {
  switch (status) {
    case 'disconnected':
      return (
        <Tooltip label="Currently disconnected">
          <ConnectionStatusIndicator status={'disconnected'} onClick={onClick} />
        </Tooltip>
      );
    case 'connected':
      return (
        <Tooltip
          label={
            <HStack>
              <IconLink />
              <Text>{`Connected to ${bridgeUrl}`}</Text>
            </HStack>
          }
        >
          <ConnectionStatusIndicator status={'connected'} onClick={onClick} />
        </Tooltip>
      );
    case 'todo':
    default:
      return (
        // FIXME: what should we show in this tooltip?
        <Tooltip label={<Text>No Novu endpoint defined!</Text>}>
          <Button size="xs" variant="outline" Icon={IconEdit} onClick={onClick}>
            Update novu endpoint
          </Button>
        </Tooltip>
      );
  }
}
