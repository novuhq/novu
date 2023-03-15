import { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Grid, Group, Modal, ActionIcon, createStyles, MantineTheme } from '@mantine/core';
import {
  ChannelTypeEnum,
  IConfigCredentials,
  ILogoFileName,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
} from '@novu/shared';

import { useAuthController, useEnvController, useIntegrations } from '../../hooks';
import { When } from '../../components/utils/When';
import { NovuEmailProviderModal } from './components/NovuEmailProviderModal';
import { NovuInAppProviderModal } from './components/NovuInAppProviderModal';
import { ChannelGroup } from './components/Modal/ChannelGroup';
import { colors, shadows, Title } from '../../design-system';
import { ConnectIntegrationForm } from './components/Modal/ConnectIntegrationForm';
import { Close } from '../../design-system/icons/actions/Close';
import { useProviders } from './useProviders';

export function IntegrationsStoreModal({
  scrollTo,
  openIntegration,
  closeIntegration,
}: {
  scrollTo?: ChannelTypeEnum;
  openIntegration: boolean;
  closeIntegration: () => void;
}) {
  const { environment } = useEnvController();
  const { organization } = useAuthController();
  const { loading: isLoading } = useIntegrations({ refetchOnMount: false });
  const { emailProviders, smsProvider, chatProvider, pushProvider } = useProviders();
  const [isFormOpened, setFormIsOpened] = useState(false);
  const [isCreateIntegrationModal, setIsCreateIntegrationModal] = useState(false);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);

  const { classes } = useModalStyles();

  async function handlerVisible(
    visible: boolean,
    createIntegrationModal: boolean,
    providerConfig: IIntegratedProvider
  ) {
    setFormIsOpened(visible);
    setProvider(providerConfig);
    setIsCreateIntegrationModal(createIntegrationModal);
  }

  const handleModalClose = useCallback(() => {
    closeIntegration();
    setFormIsOpened(false);
    setProvider(null);
  }, [closeIntegration]);

  const handleCloseForm = useCallback(() => {
    if (isFormOpened) {
      setProvider(null);
      setFormIsOpened(false);

      return;
    }

    closeIntegration();
  }, [isFormOpened, closeIntegration]);

  const handleKeyDown = useCallback(
    (e) => {
      if (openIntegration && e.key === 'Escape') {
        handleCloseForm();
      }
    },
    [openIntegration, handleCloseForm]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!scrollTo || !openIntegration) return;

    setTimeout(() => {
      const channelSection = document.getElementById(scrollTo);
      const modalContainer = document.querySelector('.mantine-Modal-modal');
      if (channelSection && modalContainer) {
        modalContainer.scrollBy({
          top: window.pageYOffset + channelSection.getBoundingClientRect().top - HEADER_HEIGHT,
          behavior: 'smooth',
        });
      }
    }, 0);
  }, [openIntegration, scrollTo]);

  return (
    <Modal
      withCloseButton={false}
      closeOnEscape={!isFormOpened}
      title={
        <Group style={{ width: '100%' }} position={'apart'}>
          <Title>Integration Store</Title>
          <ActionIcon variant={'transparent'} onClick={handleModalClose}>
            <Close />
          </ActionIcon>
        </Group>
      }
      classNames={classes}
      fullScreen
      opened={openIntegration}
      onClose={handleModalClose}
    >
      <Grid gutter={24} sx={{ margin: 0 }}>
        <Grid.Col lg={isFormOpened ? 8 : 12}>
          {!isLoading ? (
            <>
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.EMAIL}
                providers={emailProviders}
                title="Email"
                onProviderClick={handlerVisible}
              />
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.SMS}
                providers={smsProvider}
                title="SMS"
                onProviderClick={handlerVisible}
              />
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.CHAT}
                providers={chatProvider}
                title="Chat"
                onProviderClick={handlerVisible}
              />
              <ChannelGroup
                selectedProvider={provider?.providerId}
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
            <IntegrationCardWrapper onKeyDown={handleKeyDown}>
              <When truthy={!provider?.novu}>
                <ConnectIntegrationForm
                  onClose={handleCloseForm}
                  onSuccessFormSubmit={closeIntegration}
                  key={provider?.providerId}
                  provider={provider}
                  createModel={isCreateIntegrationModal}
                  organization={organization}
                  environment={environment}
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

const HEADER_HEIGHT_SMALL = 70;
const HEADER_HEIGHT = 90;
const HEADER_MARGIN = 10;
const DISTANCE_FROM_HEADER = 64;
const INTEGRATION_SETTING_TOP_SMALL = HEADER_HEIGHT_SMALL + HEADER_MARGIN + DISTANCE_FROM_HEADER;
const INTEGRATION_SETTING_TOP = HEADER_HEIGHT + HEADER_MARGIN + DISTANCE_FROM_HEADER;

const IntegrationCardWrapper = styled.div`
  position: sticky;
  top: ${INTEGRATION_SETTING_TOP_SMALL}px;
  box-sizing: border-box;
  padding: 0;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  height: calc(100vh - ${INTEGRATION_SETTING_TOP_SMALL + 20}px);
  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
  border-radius: 7px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.B98)};
  overflow: hidden;

  @media screen and (min-width: 1367px) {
    top: ${INTEGRATION_SETTING_TOP}px;
    height: calc(100vh - ${INTEGRATION_SETTING_TOP + 40}px);
  }
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
      height: HEADER_HEIGHT_SMALL,
      zIndex: 9,
      boxShadow: dark ? shadows.dark : shadows.medium,
      backgroundColor: dark ? colors.BGDark : colors.white,
      marginBottom: 10,
      '@media screen and (min-width: 1367px)': {
        height: HEADER_HEIGHT,
      },
    },
    title: {
      width: '100%',
      h1: {
        fontSize: 22,
      },
      '@media screen and (min-width: 1367px)': {
        h1: {
          fontSize: 26,
        },
      },
    },
    modal: {
      backdropFilter: 'blur(15px)',
      padding: '0px 30px !important',
      backgroundColor: dark ? theme.fn.rgba(colors.BGDark, 0.8) : theme.fn.rgba(colors.white, 0.7),
    },
  };
});

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
