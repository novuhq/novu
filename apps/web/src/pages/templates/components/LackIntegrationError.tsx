import { useState } from 'react';
import styled from '@emotion/styled';
import { ChannelTypeEnum } from '@novu/shared';

import { Text } from '../../../design-system';
import { DoubleArrowRight } from '../../../design-system/icons/arrows/CircleArrowRight';
import { IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';

const DoubleArrowRightStyled = styled(DoubleArrowRight)`
  cursor: pointer;
`;

export function LackIntegrationError({
  channel,
  channelType,
  text,
}: {
  channel: string;
  channelType: ChannelTypeEnum;
  text?: string;
}) {
  const [isIntegrationsModalOpened, openIntegrationsModal] = useState(false);

  return (
    <>
      <WarningMessage>
        <Text>
          {text
            ? text
            : `Looks like you haven’t configured your ${channel} provider yet, this channel will be disabled until you configure it.`}
        </Text>
        <DoubleArrowRightStyled onClick={() => openIntegrationsModal(true)} />
      </WarningMessage>
      <IntegrationsStoreModal
        openIntegration={isIntegrationsModalOpened}
        closeIntegration={() => openIntegrationsModal(false)}
        scrollTo={channelType}
      />
    </>
  );
}

const WarningMessage = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 40px;
  color: #e54545;

  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
`;
