import { Tooltip } from '@novu/design-system';
import { Button, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconEdit, IconLink } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { useHover } from '../../../../hooks/useHover';
import { BridgeUpdateModal } from './BridgeUpdateModal';
import { ConnectionStatus, ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { getBridgeUrl } from './utils';

/**
 * FIXME: Implement this helper -- determine what are the inputs to determine the status.
 * Gets the bridge connection status based on environment state and connection info.
 */
const selectBridgeStatus = (): ConnectionStatus => {
  return 'disconnected';
};

export const BridgeUpdateModalTrigger: FC = () => {
  const hoverProps = useHover();

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
  status: ConnectionStatus;
  bridgeUrl?: string | null;
  onClick: () => void;
} & ReturnType<typeof useHover>) {
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
              <Text>{`Connected to ${bridgeUrl}`}</Text>
            </HStack>
          }
        >
          {trigger}
        </Tooltip>
      );
    case 'disconnected':
    default:
      return <Tooltip label="No connection to Bridge URL">{trigger}</Tooltip>;
  }
}
