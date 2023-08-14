import { useState } from 'react';
import styled from '@emotion/styled';

import { ChannelTypeEnum } from '@novu/shared';

import { Text } from '../../../design-system';
import { CircleArrowRight } from '../../../design-system/icons';
import { IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { stepNames, TemplateEditorAnalyticsEnum } from '../constants';
import { useIsMultiProviderConfigurationEnabled } from '../../../hooks';
import { IntegrationsListModal } from '../../integrations/IntegrationsListModal';

type alertType = 'error' | 'warning';

export function LackIntegrationAlert({
  channelType,
  text,
  type = 'error',
  iconHeight = 18,
  iconWidth = 18,
}: {
  channelType: ChannelTypeEnum;
  text?: string;
  iconHeight?: number | string | undefined;
  iconWidth?: number | string | undefined;
  type?: alertType;
}) {
  const segment = useSegment();
  const [isIntegrationsModalOpened, openIntegrationsModal] = useState(false);
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();

  const onIntegrationModalClose = () => openIntegrationsModal(false);

  return (
    <>
      <WarningMessage backgroundColor={alertTypeToMessageBackgroundColor(type)}>
        <Text>
          {text
            ? text
            : 'Looks like you haven’t configured your ' +
              stepNames[channelType] +
              ' provider yet, this channel will be disabled until you configure it.'}
        </Text>
        <DoubleArrowRightStyled
          color={alertTypeToDoubleArrowColor(type)}
          onClick={() => {
            openIntegrationsModal(true);
            segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_BANNER_CLICK);
          }}
          height={iconHeight}
          width={iconWidth}
        />
      </WarningMessage>
      {isMultiProviderConfigurationEnabled ? (
        <IntegrationsListModal
          isOpen={isIntegrationsModalOpened}
          onClose={onIntegrationModalClose}
          scrollTo={channelType}
        />
      ) : (
        <IntegrationsStoreModal
          openIntegration={isIntegrationsModalOpened}
          closeIntegration={onIntegrationModalClose}
          scrollTo={channelType}
        />
      )}
    </>
  );
}

const DoubleArrowRightStyled = styled(CircleArrowRight)<{ color?: string | undefined }>`
  cursor: pointer;
  color: ${({ color }) => color};
`;

const WarningMessage = styled.div<{ backgroundColor: string }>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 40px;
  color: #e54545;

  background: ${({ backgroundColor }) => backgroundColor};
  border-radius: 7px;
`;

function alertTypeToDoubleArrowColor(type: alertType) {
  switch (type) {
    case 'warning':
      return 'rgba(234, 169, 0, 1)';
    default:
      return 'undefined';
  }
}

function alertTypeToMessageBackgroundColor(type: alertType) {
  switch (type) {
    case 'error':
      return 'rgba(230, 69, 69, 0.15)';
    case 'warning':
      return 'rgba(234, 169, 0, 0.15)';
    default:
      return 'rgba(230, 69, 69, 0.15)';
  }
}
