import { Group, Stack, Text, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, NOVU_SMS_EMAIL_PROVIDERS } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { Button, colors, Tooltip } from '@novu/design-system';
import { useEnvController } from '../../../hooks';
import { IntegrationEnvironmentPill } from '../../integrations/components/IntegrationEnvironmentPill';
import { IntegrationStatus } from '../../integrations/components/IntegrationStatus';
import type { IIntegratedProvider } from '../../integrations/types';
import { stepNames } from '../constants';
import { ChannelTitle } from './ChannelTitle';
import { LackIntegrationAlert } from './LackIntegrationAlert';

export const ListProviders = ({
  channel,
  providers,
  setConfigureChannel,
  setProvider,
}: {
  channel: ChannelTypeEnum;
  providers: IIntegratedProvider[];
  setConfigureChannel: (channel: ChannelTypeEnum) => void;
  setProvider: (provider: IIntegratedProvider) => void;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const { environment: currentEnvironment } = useEnvController();

  return (
    <div
      style={{
        marginBottom: 32,
        overflow: 'hidden',
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
          <ChannelTitle spacing={8} channel={channel} />
          <Button
            sx={{
              height: '32px',
              padding: '7.5px 15px',
            }}
            variant={providers.filter((provider) => provider.connected).length > 0 ? 'outline' : 'gradient'}
            onClick={() => {
              setConfigureChannel(channel);
            }}
          >
            Configure
          </Button>
        </Group>
      </div>
      {providers
        .filter((provider) => provider.connected && provider.environmentId === currentEnvironment?._id)
        .map((provider) => {
          return (
            <UnstyledButton
              key={provider.identifier ?? provider.providerId}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: colorScheme === 'dark' ? colors.B20 : colors.B98,
                borderRadius: 8,
                marginBottom: 12,
                lineHeight: 1,
                opacity: provider.active ? 1 : colorScheme === 'dark' ? 1 : 0.4,
              }}
              onClick={() => {
                setProvider(provider);
                setConfigureChannel(provider.channel);
              }}
            >
              <Group spacing={16} position="apart">
                <Group spacing={16} position="apart">
                  <img
                    src={'/static/images/providers/' + colorScheme + '/square/' + provider.providerId + '.svg'}
                    alt={provider.displayName}
                    style={{
                      height: '24px',
                      maxWidth: '140px',
                      opacity: provider.active ? 1 : colorScheme === 'dark' ? 0.4 : 1,
                    }}
                  />

                  <Stack
                    sx={{
                      width: '117px',
                    }}
                    spacing={0}
                  >
                    <Tooltip label={provider.displayName}>
                      <Text size="md" truncate="end">
                        {provider.name || provider.displayName}
                      </Text>
                    </Tooltip>
                    <When truthy={provider.identifier !== undefined}>
                      <Text
                        sx={{
                          color: colors.B40,
                        }}
                        size="sm"
                      >
                        Key: {provider.identifier}
                      </Text>
                    </When>
                  </Stack>
                </Group>
                <Group spacing={16} position="apart">
                  <IntegrationEnvironmentPill name={currentEnvironment?.name || 'Development'} />
                  <div
                    style={{
                      minWidth: 76,
                    }}
                  >
                    <IntegrationStatus active={provider.active} />
                  </div>
                </Group>
              </Group>
            </UnstyledButton>
          );
        })}
      <LackIntegrationByType providers={providers} channel={channel} />
    </div>
  );
};

const LackIntegrationByType = ({
  providers,
  channel,
}: {
  providers: IIntegratedProvider[];
  channel: ChannelTypeEnum;
}) => {
  const { environment: currentEnvironment } = useEnvController();
  const containsNovuProvider = NOVU_SMS_EMAIL_PROVIDERS.some(
    (providerId) => providerId === providers.find((provider) => provider.connected)?.providerId
  );

  return (
    <>
      <When truthy={providers.filter((provider) => provider.connected).length === 0}>
        <div
          style={{
            marginBottom: -28,
          }}
        >
          <LackIntegrationAlert
            text={`Please configure ${stepNames[channel]} provider to activate the channel`}
            channelType={channel}
          />
        </div>
      </When>
      <When
        truthy={
          providers.filter((provider) => provider.connected && provider.environmentId === currentEnvironment?._id)
            .length === 1 && containsNovuProvider
        }
      >
        <div
          style={{
            marginBottom: -28,
          }}
        >
          <LackIntegrationAlert text={'Connect a provider for this channel'} channelType={channel} type={'warning'} />
        </div>
      </When>
    </>
  );
};
