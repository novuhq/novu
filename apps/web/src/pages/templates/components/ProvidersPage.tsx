import { useState } from 'react';
import { Center, Loader, ScrollArea } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';

import { colors } from '@novu/design-system';
import type { IIntegratedProvider } from '../../integrations/types';
import { useProviders } from '../../integrations/useProviders';
import { ListProviders } from './ListProviders';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';
import { IntegrationsListModal } from '../../integrations/IntegrationsListModal';
import { WorkflowSidebar } from './WorkflowSidebar';

export function ProvidersPage() {
  const { emailProviders, smsProvider, chatProvider, pushProvider, inAppProvider, isLoading } = useProviders();
  const [configureChannel, setConfigureChannel] = useState<ChannelTypeEnum | undefined>(undefined);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);

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
      <WorkflowSidebar title="Workflow Settings">
        <WorkflowSettingsTabs />
        <ScrollArea h="calc(100vh - 220px)" offsetScrollbars mr={-12}>
          <ListProviders
            channel={ChannelTypeEnum.IN_APP}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            channelProviders={inAppProvider}
          />
          <ListProviders
            channel={ChannelTypeEnum.EMAIL}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            channelProviders={emailProviders}
          />
          <ListProviders
            channel={ChannelTypeEnum.CHAT}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            channelProviders={chatProvider}
          />
          <ListProviders
            channel={ChannelTypeEnum.PUSH}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            channelProviders={pushProvider}
          />
          <ListProviders
            channel={ChannelTypeEnum.SMS}
            setProvider={setProvider}
            setConfigureChannel={setConfigureChannel}
            channelProviders={smsProvider}
          />
        </ScrollArea>
      </WorkflowSidebar>
      <IntegrationsListModal
        isOpen={configureChannel !== undefined}
        selectedProvider={provider}
        onClose={onIntegrationModalClose}
        scrollTo={configureChannel}
      />
    </>
  );
}
