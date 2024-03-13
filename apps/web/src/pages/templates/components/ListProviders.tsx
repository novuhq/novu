import { MouseEventHandler, useMemo } from 'react';
import styled from '@emotion/styled';
import { Group, Stack, Text, UnstyledButton, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, NOVU_SMS_EMAIL_PROVIDERS } from '@novu/shared';
import { Button, colors, Tooltip } from '@novu/design-system';

import { When } from '../../../components/utils/When';
import { useEnvController } from '../../../hooks';
import { IntegrationEnvironmentPill } from '../../integrations/components/IntegrationEnvironmentPill';
import { IntegrationStatus } from '../../integrations/components/IntegrationStatus';
import type { IIntegratedProvider } from '../../integrations/types';
import { stepNames } from '../constants';
import { ChannelTitle } from './ChannelTitle';
import { LackIntegrationAlert } from './LackIntegrationAlert';

const getIntegrationIcon = (colorScheme: string, providerId: string) => {
  return '/static/images/providers/' + colorScheme + '/square/' + providerId + '.svg';
};

const ListProvidersContainer = styled.div`
  margin-bottom: 2rem;
  overflow: hidden;
`;

const TitleAndButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${colors.B60};
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
`;

const ConfigureButton = styled(Button)`
  height: 2rem;
  padding: 0.5rem 1rem;
`;

const IntegrationButton = styled(UnstyledButton)<
  { isActive: boolean; isDark: boolean } & { onClick?: MouseEventHandler<HTMLButtonElement> }
>`
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: ${({ isDark }) => (isDark ? colors.B20 : colors.B98)};
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  line-height: 1;
  opacity: ${({ isActive, isDark }) => (isActive || isDark ? 1 : 0.4)};
`;

const IntegrationIcon = styled.img<{ isActive: boolean; isDark: boolean }>`
  height: 1.5rem;
  max-width: 8.75rem;
  opacity: ${({ isActive, isDark }) => (isActive || isDark ? 1 : 0.4)};
`;

const IntegrationStatusStyled = styled(IntegrationStatus)`
  min-width: 5rem;
`;

export const ListProviders = ({
  channel,
  channelProviders,
  setConfigureChannel,
  setProvider,
}: {
  channel: ChannelTypeEnum;
  channelProviders: IIntegratedProvider[];
  setConfigureChannel: (channel: ChannelTypeEnum) => void;
  setProvider: (provider: IIntegratedProvider) => void;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const { environment: currentEnvironment } = useEnvController();
  const containsNovuProvider = useMemo(
    () =>
      NOVU_SMS_EMAIL_PROVIDERS.some(
        (providerId) => providerId === channelProviders.find((provider) => provider.connected)?.providerId
      ),
    [channelProviders]
  );
  const providersForTheCurrentEnvironment = useMemo(
    () =>
      channelProviders.filter((provider) => provider.connected && provider.environmentId === currentEnvironment?._id),
    [channelProviders, currentEnvironment?._id]
  );
  const hasProviders = providersForTheCurrentEnvironment.length > 0;
  const hasNovuProvider = providersForTheCurrentEnvironment.length === 1 && containsNovuProvider;
  const isDark = colorScheme === 'dark';

  return (
    <ListProvidersContainer>
      <TitleAndButtonContainer>
        <ChannelTitle spacing={8} channel={channel} />
        <ConfigureButton
          variant={hasProviders ? 'outline' : 'gradient'}
          onClick={() => {
            setConfigureChannel(channel);
          }}
        >
          Configure
        </ConfigureButton>
      </TitleAndButtonContainer>
      {providersForTheCurrentEnvironment.map((provider) => {
        return (
          <IntegrationButton
            key={provider.identifier ?? provider.providerId}
            isDark={isDark}
            isActive={provider.active}
            onClick={() => {
              setProvider(provider);
              setConfigureChannel(provider.channel);
            }}
          >
            <Group spacing={16} position="apart">
              <Group spacing={16} position="apart">
                <IntegrationIcon
                  src={getIntegrationIcon(colorScheme, provider.providerId)}
                  alt={provider.displayName}
                  isDark={isDark}
                  isActive={provider.active}
                />
                <Stack w="15rem" spacing={0}>
                  <Tooltip label={provider.displayName}>
                    <Text size="md" truncate="end">
                      {provider.name || provider.displayName}
                    </Text>
                  </Tooltip>
                  <When truthy={provider.identifier}>
                    <Text color={colors.B40} size="sm">
                      Key: {provider.identifier}
                    </Text>
                  </When>
                </Stack>
              </Group>
              <Group spacing={16} position="apart">
                <IntegrationEnvironmentPill name={currentEnvironment?.name || 'Development'} />
                <IntegrationStatusStyled active={provider.active} />
              </Group>
            </Group>
          </IntegrationButton>
        );
      })}
      <When truthy={!hasProviders}>
        <LackIntegrationAlert
          text={`Please configure ${stepNames[channel]} provider to activate the channel`}
          channelType={channel}
        />
      </When>
      <When truthy={hasNovuProvider}>
        <LackIntegrationAlert text={'Connect a provider for this channel'} channelType={channel} type={'warning'} />
      </When>
    </ListProvidersContainer>
  );
};
