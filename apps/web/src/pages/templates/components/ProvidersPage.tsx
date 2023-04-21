import { Center, Loader } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
import { useState } from 'react';
import { colors } from '../../../design-system';
import { useIntegrations } from '../../../hooks';
import { IIntegratedProvider, IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';
import { useProviders } from '../../integrations/useProviders';
import { ListProviders } from './ListProviders';
import { SubPageWrapper } from './SubPageWrapper';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';

export function ProvidersPage() {
  const { loading: isLoading } = useIntegrations({ refetchOnMount: false });
  const { emailProviders, smsProvider, chatProvider, pushProvider } = useProviders();
  const [configureChannel, setConfigureChannel] = useState<ChannelTypeEnum | undefined>(undefined);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);

  if (isLoading) {
    return (
      <Center>
        <Loader color={colors.B70} mb={20} mt={20} size={32} />
      </Center>
    );
  }

  return (
    <>
      <SubPageWrapper title="Workflow Settings">
        <WorkflowSettingsTabs />
        <ListProviders setProvider={setProvider} setConfigureChannel={setConfigureChannel} providers={emailProviders} />
        <ListProviders setProvider={setProvider} setConfigureChannel={setConfigureChannel} providers={chatProvider} />
        <ListProviders setProvider={setProvider} setConfigureChannel={setConfigureChannel} providers={pushProvider} />
        <ListProviders setProvider={setProvider} setConfigureChannel={setConfigureChannel} providers={smsProvider} />
      </SubPageWrapper>
      <IntegrationsStoreModal
        selectedProvider={provider}
        openIntegration={configureChannel !== undefined}
        closeIntegration={() => {
          setProvider(null);
          setConfigureChannel(undefined);
        }}
        scrollTo={configureChannel}
      />
    </>
  );
}
