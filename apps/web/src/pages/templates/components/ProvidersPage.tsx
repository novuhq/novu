import { Center, Group, Loader, Text, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
import { useState } from 'react';
import { When } from '../../../components/utils/When';
import { Button, colors } from '../../../design-system';
import { useIntegrations } from '../../../hooks';
import { IIntegratedProvider, IntegrationsStoreModal } from '../../integrations/IntegrationsStoreModal';
import { useProviders } from '../../integrations/useProviders';
import { ChannelTitle } from './ChannelTitle';
import { getChannelCopy, LackIntegrationError } from './LackIntegrationError';
import { SubPageWrapper } from './SubPageWrapper';
import { WorkflowSettingsTabs } from './WorkflowSettingsTabs';

const ListProviders = ({
  providers,
  setConfigureChannel,
  setProvider,
}: {
  providers: IIntegratedProvider[];
  setConfigureChannel: (channel: ChannelTypeEnum) => void;
  setProvider: (provider: IIntegratedProvider) => void;
}) => {
  const { colorScheme } = useMantineColorScheme();

  return (
    <div
      style={{
        marginBottom: 32,
      }}
    >
      <div
        style={{
          color: colors.B60,
          marginBottom: 12,
          fontSize: 14,
          lineHeight: '20px',
        }}
      >
        <Group position="apart">
          <ChannelTitle spacing={8} channel={providers[0].channel} />
          <Button
            sx={{
              height: '32px',
              padding: '7.5px 15px',
            }}
            variant={providers.filter((provider) => provider.connected).length > 0 ? 'outline' : 'gradient'}
            onClick={() => {
              setConfigureChannel(providers[0].channel);
            }}
          >
            Configure
          </Button>
        </Group>
      </div>
      <When truthy={providers.filter((provider) => provider.connected).length === 0}>
        <div
          style={{
            marginBottom: -28,
          }}
        >
          <LackIntegrationError
            text={`Please configure ${getChannelCopy(providers[0].channel)} provider to activate the channel`}
            channelType={providers[0].channel}
          />
        </div>
      </When>
      {providers
        .filter((provider) => provider.connected)
        .map((provider) => {
          return (
            <UnstyledButton
              style={{
                width: '100%',
                padding: 15,
                background: colors.B20,
                borderRadius: 8,
                marginBottom: 12,
                lineHeight: 1,
              }}
              onClick={() => {
                setProvider(provider);
                setConfigureChannel(provider.channel);
              }}
            >
              <Group position="apart">
                <img
                  src={'/static/images/providers/' + colorScheme + '/' + provider.logoFileName[`${colorScheme}`]}
                  alt={provider.displayName}
                  style={{
                    height: '24px',
                    maxWidth: '140px',
                  }}
                />
                <Text color={provider.active ? colors.success : colors.B60}>
                  <When truthy={provider.active}>Active</When>
                  <When truthy={!provider.active}>Disabled</When>
                </Text>
              </Group>
            </UnstyledButton>
          );
        })}
    </div>
  );
};

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
        defaultProvider={provider}
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
