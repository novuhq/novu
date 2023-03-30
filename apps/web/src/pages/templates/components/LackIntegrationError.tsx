import { useState } from 'react';
import styled from '@emotion/styled';
import { ChannelTypeEnum } from '@novu/shared';

import { Text } from '../../../design-system';
import { DoubleArrowRight } from '../../../design-system/icons/arrows/CircleArrowRight';
import { IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { TemplateEditorAnalyticsEnum } from '../constants';

const DoubleArrowRightStyled = styled(DoubleArrowRight)`
  cursor: pointer;
`;

export const getChannelCopy = (channelType: ChannelTypeEnum) => {
  switch (channelType) {
    case ChannelTypeEnum.SMS:
      return 'SMS';
    case ChannelTypeEnum.EMAIL:
      return 'E-Mail';
    case ChannelTypeEnum.PUSH:
      return 'Push';
    case ChannelTypeEnum.CHAT:
      return 'Chat';
    default:
      return '';
  }
};

export function LackIntegrationError({ channelType, text }: { channelType: ChannelTypeEnum; text?: string }) {
  const segment = useSegment();
  const [isIntegrationsModalOpened, openIntegrationsModal] = useState(false);

  return (
    <>
      <WarningMessage>
        <Text>
          {text
            ? text
            : `Looks like you haven’t configured your ${getChannelCopy(
                channelType
              )} provider yet, this channel will be disabled until you configure it.`}
        </Text>
        <DoubleArrowRightStyled
          onClick={() => {
            openIntegrationsModal(true);
            segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_BANNER_CLICK);
          }}
        />
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
