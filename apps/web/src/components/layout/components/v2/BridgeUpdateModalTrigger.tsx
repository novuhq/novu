import { FC, useState } from 'react';
import { Tooltip } from '@novu/design-system';
import { Text, Button } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconEdit, IconLink, IconLinkOff } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { useHover } from '../../../../hooks/useHover';
import { BridgeUpdateModal } from './BridgeUpdateModal';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { useBridgeConnectionStatus } from '../../../../studio/hooks';

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

// TODO: agree on token for max tooltip width
const tooltipTextClassName = css({ textWrap: 'wrap', wordBreak: 'break-all', maxWidth: '[27rem]' });

function BridgeUpdateModalTriggerControl({ onClick }: { onClick: () => void }) {
  const { isHovered, ...hoverProps } = useHover();
  const { status, bridgeURL } = useBridgeConnectionStatus();

  const trigger = isHovered ? (
    <Button {...hoverProps} variant="outline" size="xs" Icon={IconEdit} onClick={onClick}>
      Edit endpoint
    </Button>
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
              <Text className={tooltipTextClassName}>{`Connected to ${bridgeURL}`}</Text>
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
          classNames={{ tooltip: css({}) }}
          label={
            <HStack>
              <IconLinkOff />
              <Text className={tooltipTextClassName}>
                {bridgeURL ? `Unable to connect to ${bridgeURL}` : `No Bridge URL configured`}
              </Text>
            </HStack>
          }
        >
          {trigger}
        </Tooltip>
      );
  }
}
