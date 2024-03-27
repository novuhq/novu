import { Container, Grid } from '@mantine/core';
import { Title } from '@novu/design-system';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

import type { IIntegratedProvider } from '../../types';
import { When } from '../../../../components/utils/When';
import { CONTEXT_PATH, IS_DOCKER_HOSTED } from '../../../../config';
import { ProviderCard } from './ProviderCard';
import { NovuIntegrationCard } from './NovuIntegrationCard';

export function ChannelGroup({
  title,
  providers,
  onProviderClick,
  channel,
  selectedProvider,
}: {
  providers: IIntegratedProvider[];
  title: string;
  selectedProvider?: string;
  onProviderClick: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
  channel: ChannelTypeEnum;
}) {
  function handlerOnConnectClick(visible: boolean, create: boolean, provider: IIntegratedProvider) {
    onProviderClick(visible, create, provider);
  }

  return (
    <Container id={channel} fluid>
      <Grid mx={0} mb={50}>
        <Grid.Col span={12} data-test-id={`integration-group-${title.toLowerCase()}`}>
          <Title size={2}>{title}</Title>
        </Grid.Col>
        <When truthy={channel === ChannelTypeEnum.EMAIL && !IS_DOCKER_HOSTED}>
          <Grid.Col lg={3} xl={2}>
            <NovuIntegrationCard
              selected={selectedProvider === EmailProviderIdEnum.Novu}
              provider={{
                providerId: EmailProviderIdEnum.Novu,
                integrationId: '',
                displayName: 'Novu Email Provider',
                channel: ChannelTypeEnum.EMAIL,
                credentials: [],
                docReference: '',
                comingSoon: false,
                active:
                  providers.filter((provider) => provider.active && provider.channel === ChannelTypeEnum.EMAIL)
                    .length === 0,
                connected: true,
                logoFileName: {
                  dark: CONTEXT_PATH + '/static/images/logo-light.png',
                  light: CONTEXT_PATH + '/static/images/logo.png',
                },
                betaVersion: false,
                novu: true,
                primary: false,
              }}
              onConnectClick={handlerOnConnectClick}
            />
          </Grid.Col>
        </When>
        <When truthy={channel === ChannelTypeEnum.SMS && !IS_DOCKER_HOSTED}>
          <Grid.Col lg={3} xl={2}>
            <NovuIntegrationCard
              selected={selectedProvider === SmsProviderIdEnum.Novu}
              provider={{
                providerId: SmsProviderIdEnum.Novu,
                integrationId: '',
                displayName: 'Novu SMS Provider',
                channel: ChannelTypeEnum.SMS,
                credentials: [],
                docReference: '',
                comingSoon: false,
                active:
                  providers.filter((provider) => provider.active && provider.channel === ChannelTypeEnum.SMS).length ===
                  0,
                connected: true,
                logoFileName: {
                  dark: CONTEXT_PATH + '/static/images/logo-light.png',
                  light: CONTEXT_PATH + '/static/images/logo.png',
                },
                betaVersion: false,
                novu: true,
                primary: false,
              }}
              onConnectClick={handlerOnConnectClick}
            />
          </Grid.Col>
        </When>
        {providers.map((provider) => (
          <Grid.Col lg={3} xl={2} key={provider.providerId}>
            <ProviderCard
              selected={selectedProvider === provider.providerId}
              provider={provider}
              onConnectClick={handlerOnConnectClick}
            />
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
}
