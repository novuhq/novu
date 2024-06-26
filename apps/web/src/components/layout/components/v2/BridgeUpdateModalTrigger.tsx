import { FC, useMemo, useState } from 'react';
import { Tooltip } from '@novu/design-system';
import { Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconEdit, IconLink, IconLinkOff } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { useHover } from '../../../../hooks/useHover';
import { useHealthCheck } from '../../../../studio/hooks';
import { BridgeUpdateModal } from './BridgeUpdateModal';
import { ConnectionStatusIndicator, type ConnectionStatus } from './ConnectionStatusIndicator';

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
  const { data, isFetching, error, bridgeURL } = useHealthCheck();

  console.log('data', data, isFetching, bridgeURL);
  const status = useMemo<ConnectionStatus>(() => {
    if (isFetching) {
      return 'loading';
    }

    if (bridgeURL && !error && data?.status === 'ok') {
      return 'connected';
    }

    return 'disconnected';
  }, [bridgeURL, isFetching, data, error]);

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
