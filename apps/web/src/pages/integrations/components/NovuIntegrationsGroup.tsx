import { Grid, Text } from '@mantine/core';
import { Title } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { ChannelTypeEnum, EmailProviderIdEnum, InAppProviderIdEnum } from '@novu/shared';
import { IS_DOCKER_HOSTED } from '../../../config';
import { NovuIntegrationCard } from './NovuIntegrationCard';
import { When } from '../../../components/utils/When';

export function NovuIntegrationGroup({
  providers,
  onProviderClick,
}: {
  providers: IIntegratedProvider[];

  onProviderClick: (visible: boolean, create: boolean, provider: IIntegratedProvider) => void;
}) {
  function handlerOnConnectClick(visible: boolean, create: boolean, provider: IIntegratedProvider) {
    onProviderClick(visible, create, provider);
  }

  if (!IS_DOCKER_HOSTED) {
    return null;
  }

  return (
    <Grid mb={50}>
      <Grid.Col span={12} data-test-id={`integration-group-novu`}>
        <Title size={2}>Novu Providers</Title>
      </Grid.Col>
      <Grid.Col sm={12} xs={6} md={4} lg={3}>
        <Text align="center" mb={16} size="xl">
          Email
        </Text>
        <NovuIntegrationCard
          provider={{
            providerId: EmailProviderIdEnum.Novu,
            integrationId: '',
            displayName: 'Novu Email Provider',
            channel: ChannelTypeEnum.EMAIL,
            credentials: [],
            docReference: '',
            comingSoon: false,
            active:
              providers.filter((provider) => provider.active && provider.channel === ChannelTypeEnum.EMAIL).length ===
              0,
            connected: true,
            logoFileName: {
              light: '/static/images/logo-formerly-light-bg.png',
              dark: '/static/images/logo-formerly-dark-bg.png',
            },
            betaVersion: false,
            novu: true,
          }}
          onConnectClick={handlerOnConnectClick}
        />
      </Grid.Col>

      <Grid.Col sm={12} xs={6} md={4} lg={3}>
        <Text align="center" mb={16} size="xl">
          In App
        </Text>
        <NovuIntegrationCard
          ribbonText="Always available"
          provider={{
            providerId: InAppProviderIdEnum.Novu,
            integrationId: '',
            displayName: 'Novu In App Provider',
            channel: ChannelTypeEnum.IN_APP,
            credentials: [],
            docReference: '',
            comingSoon: false,
            active: true,
            connected: true,
            logoFileName: {
              light: '/static/images/logo-formerly-light-bg.png',
              dark: '/static/images/logo-formerly-dark-bg.png',
            },
            betaVersion: false,
            novu: true,
          }}
        />
      </Grid.Col>
    </Grid>
  );
}
