import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import {
  ChannelTypeEnum,
  IConfigCredentials,
  ILogoFileName,
  providers,
  PushProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
} from '@novu/shared';
import { Grid, Group, Modal, ActionIcon, useMantineColorScheme, createStyles, MantineTheme } from '@mantine/core';
import * as cloneDeep from 'lodash.clonedeep';
import { useIntegrations } from '../../hooks';
import { When } from '../../components/utils/When';
import { NovuEmailProviderModal } from './components/NovuEmailProviderModal';
import { NovuInAppProviderModal } from './components/NovuInAppProviderModal';
import { ChannelGroup } from './components/Modal/ChannelGroup';
import { colors, shadows, Title } from '../../design-system';
import { ConnectIntegrationForm } from './components/Modal/ConnectIntegrationForm';
import { Close } from '../../design-system/icons/actions/Close';

export function IntegrationsStoreModal({
  openIntegration,
  closeIntegration,
}: {
  openIntegration: boolean;
  closeIntegration: () => void;
}) {
  const { integrations, loading: isLoading, refetch } = useIntegrations();
  const { colorScheme } = useMantineColorScheme();
  const [emailProviders, setEmailProviders] = useState<IIntegratedProvider[]>([]);
  const [smsProvider, setSmsProvider] = useState<IIntegratedProvider[]>([]);
  const [chatProvider, setChatProvider] = useState<IIntegratedProvider[]>([]);
  const [pushProvider, setPushProvider] = useState<IIntegratedProvider[]>([]);
  const [isFormOpened, setFormIsOpened] = useState(false);
  const [isCreateIntegrationModal, setIsCreateIntegrationModal] = useState(false);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const { classes } = useModalStyles();

  async function handlerVisible(
    visible: boolean,
    createIntegrationModal: boolean,
    providerConfig: IIntegratedProvider
  ) {
    setFormIsOpened(visible);
    setProvider(providerConfig);
    setSelectedProvider(providerConfig.providerId);
    setIsCreateIntegrationModal(createIntegrationModal);
  }

  async function handlerShowForm(showForm: boolean) {
    await setFormIsOpened(showForm);
    if (!showForm) {
      await refetch();
    }
  }

  function handleCloseForm() {
    setSelectedProvider('');
    setFormIsOpened(false);
  }

  useEffect(() => {
    if (integrations) {
      const initializedProviders = initializeProviders(integrations);

      setEmailProviders(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.EMAIL))
      );
      setSmsProvider(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.SMS))
      );

      setChatProvider(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.CHAT))
      );

      setPushProvider(
        sortProviders(initializedProviders.filter((providerItem) => providerItem.channel === ChannelTypeEnum.PUSH))
      );
    }
  }, [integrations]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      handleCloseForm();
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);

    return undefined;
  }, []);

  return (
    <Modal
      withCloseButton={false}
      closeOnEscape={!isFormOpened}
      title={
        <Group style={{ width: '100%' }} position={'apart'}>
          <Title>Integration Store</Title>
          <ActionIcon variant={'transparent'} onClick={closeIntegration}>
            <Close />
          </ActionIcon>
        </Group>
      }
      classNames={classes}
      fullScreen
      opened={openIntegration}
      onClose={closeIntegration}
    >
      <Grid gutter={24}>
        <Grid.Col lg={isFormOpened ? 8 : 12}>
          {!isLoading ? (
            <>
              <ChannelGroup
                selectedProvider={selectedProvider}
                channel={ChannelTypeEnum.EMAIL}
                providers={emailProviders}
                title="Email"
                onProviderClick={handlerVisible}
              />
              <ChannelGroup
                selectedProvider={selectedProvider}
                channel={ChannelTypeEnum.SMS}
                providers={smsProvider}
                title="SMS"
                onProviderClick={handlerVisible}
              />
              <ChannelGroup
                selectedProvider={selectedProvider}
                channel={ChannelTypeEnum.CHAT}
                providers={chatProvider}
                title="Chat"
                onProviderClick={handlerVisible}
              />
              <ChannelGroup
                selectedProvider={selectedProvider}
                channel={ChannelTypeEnum.PUSH}
                providers={pushProvider}
                title="Push"
                onProviderClick={handlerVisible}
              />
            </>
          ) : null}
        </Grid.Col>
        <When truthy={isFormOpened}>
          <Grid.Col lg={4} mt={50}>
            <IntegrationCardWrapper dark={colorScheme === 'dark'} onKeyPress={handleKeyDown}>
              <When truthy={!provider?.novu}>
                <ConnectIntegrationForm
                  onClose={handleCloseForm}
                  key={provider?.providerId}
                  provider={provider}
                  showForm={handlerShowForm}
                  createModel={isCreateIntegrationModal}
                  closeIntegration={closeIntegration}
                />
              </When>
              <When truthy={provider?.providerId === EmailProviderIdEnum.Novu}>
                <div style={{ padding: '30px' }}>
                  <NovuEmailProviderModal onClose={handleCloseForm} />
                </div>
              </When>
              <When truthy={provider?.providerId === InAppProviderIdEnum.Novu}>
                <div style={{ padding: '30px' }}>
                  <NovuInAppProviderModal onClose={handleCloseForm} />
                </div>
              </When>
            </IntegrationCardWrapper>
          </Grid.Col>
        </When>
      </Grid>
    </Modal>
  );
}

const IntegrationCardWrapper = styled.div<{ dark: boolean }>`
  position: sticky;
  top: 10rem;
  box-sizing: border-box;
  padding: 0;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  height: 80vh;
  background-color: ${({ dark }) => (dark ? colors.B20 : colors.BGLight)};
  box-shadow: ${({ dark }) => (dark ? shadows.dark : shadows.medium)};
  border-radius: 7px;
`;

const useModalStyles = createStyles((theme: MantineTheme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    header: {
      position: 'sticky',
      top: 0,
      padding: '30px',
      marginLeft: '-30px',
      marginRight: '-30px',
      zIndex: 9,
      boxShadow: dark ? shadows.dark : shadows.medium,
      backgroundColor: dark ? colors.BGDark : colors.white,
    },
    title: { width: '100%' },
    modal: {
      backdropFilter: 'blur(15px)',
      padding: '0px 30px !important',
      backgroundColor: dark ? theme.fn.rgba(colors.BGDark, 0.8) : theme.fn.rgba(colors.white, 0.7),
    },
  };
});

const sortProviders = (unsortedProviders: IIntegratedProvider[]) => {
  return unsortedProviders
    .sort((a, b) => Number(b.active) - Number(a.active))
    .sort((a, b) => Number(isConnected(b)) - Number(isConnected(a)));
};

function isConnected(provider: IIntegratedProvider) {
  if (!provider.credentials.length) return false;

  return provider.credentials?.some((cred) => {
    return cred.value;
  });
}

export interface IIntegratedProvider {
  providerId: string;
  integrationId: string;
  displayName: string;
  channel: ChannelTypeEnum;
  credentials: IConfigCredentials[];
  docReference: string;
  comingSoon: boolean;
  active: boolean;
  connected: boolean;
  logoFileName: ILogoFileName;
  betaVersion: boolean;
  novu?: boolean;
}

export interface ICredentials {
  apiKey?: string;
  user?: string;
  secretKey?: string;
  domain?: string;
  password?: string;
  host?: string;
  port?: string;
  secure?: boolean;
  region?: string;
  accountSid?: string;
  messageProfileId?: string;
  token?: string;
  from?: string;
  senderName?: string;
  applicationId?: string;
  clientId?: string;
  projectName?: string;
  serviceAccount?: string;
}

export interface IntegrationEntity {
  _id?: string;

  _environmentId: string;

  _organizationId: string;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  active: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;
}

function initializeProviders(integrations: IntegrationEntity[]): IIntegratedProvider[] {
  return providers.map((providerItem) => {
    const integration = integrations.find((integrationItem) => integrationItem.providerId === providerItem.id);

    const clonedCredentials = cloneDeep(providerItem.credentials);

    if (integration?.credentials && Object.keys(clonedCredentials).length !== 0) {
      clonedCredentials.forEach((credential) => {
        // eslint-disable-next-line no-param-reassign
        credential.value = integration.credentials[credential.key]?.toString();
      });
    }

    // Remove this like after the run of the fcm-credentials-migration script
    fcmFallback(integration, clonedCredentials);

    return {
      providerId: providerItem.id,
      integrationId: integration?._id ? integration._id : '',
      displayName: providerItem.displayName,
      channel: providerItem.channel,
      credentials: integration?.credentials ? clonedCredentials : providerItem.credentials,
      docReference: providerItem.docReference,
      comingSoon: !!providerItem.comingSoon,
      betaVersion: !!providerItem.betaVersion,
      active: integration?.active ?? false,
      connected: !!integration,
      logoFileName: providerItem.logoFileName,
    };
  });
}

/*
 * temporary patch before migration script
 */
function fcmFallback(integration: IntegrationEntity | undefined, clonedCredentials) {
  if (integration?.providerId === PushProviderIdEnum.FCM) {
    const serviceAccount = integration?.credentials.serviceAccount
      ? integration?.credentials.serviceAccount
      : integration?.credentials.user;

    clonedCredentials?.forEach((cred) => {
      if (cred.key === 'serviceAccount') {
        cred.value = serviceAccount;
      }
    });
  }
}
