import { useState } from 'react';
import { Center, Loader, ScrollArea } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';

import { colors } from '../../../design-system';
import { IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';
import type { IIntegratedProvider } from '../../integrations/types';
import { useProviders } from '../../integrations/useProviders';
import { ListProviders } from './ListProviders';
import { SubPageWrapper } from './SubPageWrapper';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';
import { useIsMultiProviderConfigurationEnabled } from '../../../hooks';
import { IntegrationsListModal } from '../../integrations/IntegrationsListModal';

export function ProvidersPage() {
  const { emailProviders, smsProvider, chatProvider, pushProvider, inAppProvider, isLoading } = useProviders();
  const [configureChannel, setConfigureChannel] = useState<ChannelTypeEnum | undefined>(undefined);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();

  const onIntegrationModalClose = () => {
    setProvider(null);
    setConfigureChannel(undefined);
  };

  if (isLoading) {
    return (
      <Center>
        <Loader color={colors.B70} mb={20} mt={20} size={32} />
      </Center>
    );
  }

  return (
    <>
      <SubPageWrapper
        title="Workflow Settings"
        style={{
          display: 'flex',
          flexFlow: 'column',
        }}
      >
        <WorkflowSettingsTabs />
        <ScrollArea h="calc(100vh - 220px)" offsetScrollbars mr={-12}>
          <ListProviders
            channel={ChannelTypeEnum.IN_APP}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            providers={inAppProvider}
          />
          <ListProviders
            channel={ChannelTypeEnum.EMAIL}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            providers={emailProviders}
          />
          <ListProviders
            channel={ChannelTypeEnum.CHAT}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            providers={chatProvider}
          />
          <ListProviders
            channel={ChannelTypeEnum.PUSH}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            providers={pushProvider}
          />
          <ListProviders
            channel={ChannelTypeEnum.SMS}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            providers={smsProvider}
          />
        </ScrollArea>
      </SubPageWrapper>
      {isMultiProviderConfigurationEnabled ? (
        <IntegrationsListModal
          isOpen={configureChannel !== undefined}
          selectedProvider={provider}
          onClose={onIntegrationModalClose}
          scrollTo={configureChannel}
        />
      ) : (
        <IntegrationsStoreModal
          selectedProvider={provider}
          openIntegration={configureChannel !== undefined}
          closeIntegration={onIntegrationModalClose}
          scrollTo={configureChannel}
        />
      )}
    </>
  );
}
