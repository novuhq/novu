import { ConfigConfigurationGroup, FeatureFlagsKeysEnum, IIntegration, IProviderConfig } from '@novu/shared';
import { Control } from 'react-hook-form';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { IntegrationFormData } from '../types';
import { CrossChannelConfigsGroup } from './cross-channel-configs-group';
import { InboundWebhookGroup } from './inbound-webhook-group';

export function ConfigurationGroup({
  integrationId,
  group,
  control,
  isReadOnly,
  provider,
  formData,
  onAutoConfigureSuccess,
}: {
  integrationId?: string;
  group: ConfigConfigurationGroup;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  provider?: IProviderConfig;
  formData?: IntegrationFormData;
  onAutoConfigureSuccess?: (integration: IIntegration) => void;
}) {
  const { groupType } = group;
  const isPushUnreadCountEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PUSH_UNREAD_COUNT_ENABLED, false);

  if (groupType === 'inboundWebhook') {
    return (
      <InboundWebhookGroup
        integrationId={integrationId}
        control={control}
        isReadOnly={isReadOnly}
        provider={provider}
        group={group}
        formData={formData}
        onAutoConfigureSuccess={onAutoConfigureSuccess}
      />
    );
  }

  if (groupType === 'crossChannelConfigs' && isPushUnreadCountEnabled) {
    return (
      <CrossChannelConfigsGroup integrationId={integrationId} control={control} isReadOnly={isReadOnly} group={group} />
    );
  }

  return null;
}
