/* eslint-disable max-len */
import { useState } from 'react';
import styled from '@emotion/styled';

import { ChannelTypeEnum } from '@novu/shared';

import { colors, Text } from '../../../design-system';
import { ErrorIcon, WarningIcon, CircleArrowRight } from '../../../design-system/icons';
import { IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { stepNames, TemplateEditorAnalyticsEnum } from '../constants';
import { useEnvController, useIsMultiProviderConfigurationEnabled } from '../../../hooks';
import { IntegrationsListModal } from '../../integrations/IntegrationsListModal';
import { Group } from '@mantine/core';
import { useSelectPrimaryIntegrationModal } from '../../integrations/components/multi-provider/useSelectPrimaryIntegrationModal';

type alertType = 'error' | 'warning';

export function LackIntegrationAlert({
  channelType,
  text,
  type = 'error',
  isPrimaryMissing,
}: {
  channelType: ChannelTypeEnum;
  text?: string;
  type?: alertType;
  isPrimaryMissing?: boolean;
}) {
  const segment = useSegment();
  const { environment } = useEnvController();
  const [isIntegrationsModalOpened, openIntegrationsModal] = useState(false);
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();
  const { openModal: openSelectPrimaryIntegrationModal, SelectPrimaryIntegrationModal } =
    useSelectPrimaryIntegrationModal();

  const onIntegrationModalClose = () => openIntegrationsModal(false);

  return (
    <>
      <WarningMessage
        backgroundColor={alertTypeToMessageBackgroundColor(type)}
        onClick={() => {
          if (isPrimaryMissing) {
            openSelectPrimaryIntegrationModal({
              environmentId: environment?._id,
              channelType: channelType,
              onClose: () => {
                segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PRIMARY_PROVIDER_BANNER_CLICK);
              },
            });
          } else {
            openIntegrationsModal(true);
            segment.track(TemplateEditorAnalyticsEnum.CONFIGURE_PROVIDER_BANNER_CLICK);
          }
        }}
      >
        <Group spacing={12} noWrap>
          <AlertIcon color={alertTypeToDoubleArrowColor(type)} alertType={type} />
          <Text color={alertTypeToMessageTextColor(type)}>
            {text
              ? text
              : `Please configure or activate a provider instance for the ${stepNames[channelType]} channel to send notifications over this node`}
          </Text>
          <CircleArrowRight />
        </Group>
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
      <SelectPrimaryIntegrationModal />
    </>
  );
}

const AlertIcon = ({ color, alertType }: { color?: string | undefined; alertType: alertType }) => {
  switch (alertType) {
    case 'warning':
      return <WarningIcon width="22px" height="22px" color={color} />;
    default:
      return <ErrorIcon width="22px" height="22px" color={color} />;
  }
};

const WarningMessage = styled.div<{ backgroundColor: string }>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 40px;
  color: #e54545;
  cursor: pointer;

  background: ${({ backgroundColor }) => backgroundColor};
  border-radius: 7px;
`;

function alertTypeToDoubleArrowColor(type: alertType) {
  switch (type) {
    case 'warning':
      return 'rgb(234, 169, 0)';
    default:
      return 'undefined';
  }
}

function alertTypeToMessageBackgroundColor(type: alertType) {
  switch (type) {
    case 'error':
      return 'rgba(229, 69, 69, 0.15)';
    case 'warning':
      return 'rgba(234, 169, 0, 0.15)';
    default:
      return 'rgba(229, 69, 69, 0.15)';
  }
}

function alertTypeToMessageTextColor(type: alertType) {
  switch (type) {
    case 'error':
      return colors.error;
    case 'warning':
      return 'rgb(234, 169, 0)';
    default:
      return undefined;
  }
}
