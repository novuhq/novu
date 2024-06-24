import { Tooltip } from '@novu/design-system';
import { Button } from '@novu/novui';
import { IconLink, IconEdit } from '@novu/novui/icons';
import { HStack } from '@novu/novui/jsx';
import { FC, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { BridgeUpdateModal } from './BridgeUpdateModal';
import { getBridgeUrl } from './utils';

export const BridgeUpdateModalTrigger: FC = () => {
  const [showBridgeUpdateModal, setShowBridgeUpdateModal] = useState(false);

  const toggleBridgeUpdateModalShow = () => {
    setShowBridgeUpdateModal((previous) => !previous);
  };

  return (
    <>
      <Tooltip label={<BridgeUpdateModalTriggerTooltip />}>
        <Button size="xs" variant="transparent" Icon={IconEdit} onClick={toggleBridgeUpdateModalShow}>
          Update novu endpoint
        </Button>
      </Tooltip>
      <BridgeUpdateModal isOpen={showBridgeUpdateModal} toggleOpen={toggleBridgeUpdateModalShow} />
    </>
  );
};

function BridgeUpdateModalTriggerTooltip() {
  const location = useLocation();
  const { environment, isLoading: isLoadingEnvironment } = useEnvironment();

  if (!isLoadingEnvironment) {
    return <>Getting endpoint information...</>;
  }

  const bridgeUrl = getBridgeUrl(environment, location.pathname);

  if (!bridgeUrl) {
    return <>No Novu endpoint defined!</>;
  }

  return (
    <HStack>
      <IconLink />
      {`Connected to ${bridgeUrl}`}
    </HStack>
  );
}
