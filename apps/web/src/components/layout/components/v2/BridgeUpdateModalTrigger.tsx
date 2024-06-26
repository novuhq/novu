import { Tooltip } from '@novu/design-system';
import { Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconEdit, IconLink, IconLinkOff } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC, useState } from 'react';
import { useHover } from '../../../../hooks/useHover';
import { useBridgeConnectionStatus } from '../../../../studio/hooks';
import { BridgeUpdateModal } from './BridgeUpdateModal';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';

export const BridgeUpdateModalTrigger: FC = () => {
  const [showBridgeUpdateModal, setShowBridgeUpdateModal] = useState<boolean>(false);

  const toggleBridgeUpdateModalShow = () => {
    setShowBridgeUpdateModal((previous) => !previous);
  };

  return (
    <>
      <BridgeUpdateModalTriggerControl onClick={toggleBridgeUpdateModalShow} />
      <BridgeUpdateModal isOpen={showBridgeUpdateModal} toggleOpen={toggleBridgeUpdateModalShow} />
    </>
  );
};

function BridgeUpdateModalTriggerControl({ onClick }: { onClick: () => void }) {
  const { isHovered, ...hoverProps } = useHover();
  const {
    data: { status, bridgeUrl },
  } = useBridgeConnectionStatus();

  const trigger = isHovered ? (
    <button
      {...hoverProps}
      onClick={onClick}
      className={css({ '&, & svg': { color: 'typography.text.main !important' } })}
    >
      <HStack gap="25">
        <IconEdit className={css({ color: 'icon.main' })} size="16" />
        <Text>Edit endpoint</Text>
      </HStack>
    </button>
  ) : (
    <ConnectionStatusIndicator status={status} {...hoverProps} onClick={onClick} />
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
