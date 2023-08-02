import { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Grid, Group, Modal, ActionIcon, createStyles, MantineTheme, Drawer } from '@mantine/core';
import { ChannelTypeEnum, EmailProviderIdEnum, InAppProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

import { useAuthController, useEnvController } from '../../hooks';
import { When } from '../../components/utils/When';
import { NovuEmailProviderModal } from './components/NovuEmailProviderModal';
import { NovuInAppProviderModal } from './components/NovuInAppProviderModal';
import { ChannelGroup } from './components/Modal/ChannelGroup';
import { colors, shadows, Title } from '../../design-system';
import { ConnectIntegrationForm } from './components/Modal/ConnectIntegrationForm';
import { Close } from '../../design-system/icons';
import { useProviders } from './useProviders';
import { useSegment } from '../../components/providers/SegmentProvider';
import { IntegrationsStoreModalAnalytics } from './constants';
import { NovuSmsProviderModal } from './components/NovuSmsProviderModal';
import { useCreateInAppIntegration } from '../../hooks/useCreateInAppIntegration';
import type { IIntegratedProvider } from './types';

export function IntegrationsStoreModal({
  scrollTo,
  openIntegration,
  closeIntegration,
  selectedProvider = null,
}: {
  scrollTo?: ChannelTypeEnum;
  openIntegration: boolean;
  closeIntegration: () => void;
  selectedProvider?: IIntegratedProvider | null;
}) {
  const segment = useSegment();
  const { environment } = useEnvController();
  const { organization } = useAuthController();
  const { emailProviders, smsProvider, chatProvider, pushProvider, inAppProvider, isLoading } = useProviders();
  const [isFormOpened, setFormIsOpened] = useState(false);
  const [isCreateIntegrationModal, setIsCreateIntegrationModal] = useState(false);
  const [provider, setProvider] = useState<IIntegratedProvider | null>(null);
  const { create } = useCreateInAppIntegration((data: any) => {
    setProvider({
      ...(provider as IIntegratedProvider),
      integrationId: data._id,
      active: data.active,
    });
  });

  const { classes } = useModalStyles();
  const { classes: drawerClasses } = useDrawerStyles();

  useEffect(() => {
    setFormIsOpened(selectedProvider !== null);
    setProvider(selectedProvider);
  }, [selectedProvider]);

  async function handleOnProviderClick(
    visible: boolean,
    createIntegrationModal: boolean,
    providerConfig: IIntegratedProvider
  ) {
    setFormIsOpened(visible);
    if (providerConfig.providerId === InAppProviderIdEnum.Novu && providerConfig.channel === ChannelTypeEnum.IN_APP) {
      create();
    }
    setProvider(providerConfig);
    setIsCreateIntegrationModal(createIntegrationModal);
    segment.track(IntegrationsStoreModalAnalytics.SELECT_PROVIDER_CLICK, {
      providerId: provider?.providerId,
      channel: provider?.channel,
      name: provider?.displayName,
      active: provider?.active,
    });
  }

  const handleModalClose = useCallback(() => {
    closeIntegration();
    setFormIsOpened(false);
    setProvider(null);
    segment.track(IntegrationsStoreModalAnalytics.CLOSE_MODAL);
  }, [segment, closeIntegration]);

  const handleCloseForm = useCallback(() => {
    if (isFormOpened) {
      setProvider(null);
      setFormIsOpened(false);

      return;
    }

    closeIntegration();
    segment.track(IntegrationsStoreModalAnalytics.CLOSE_MODAL);
  }, [segment, isFormOpened, setProvider, setFormIsOpened, closeIntegration]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (openIntegration && e.key === 'Escape') {
        handleCloseForm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openIntegration, handleCloseForm]);

  useEffect(() => {
    if (!scrollTo || !openIntegration) return;

    setTimeout(() => {
      const channelSection = document.getElementById(scrollTo);
      const modalContainer = document.querySelector('.mantine-Modal-modal');
      if (channelSection && modalContainer) {
        modalContainer.scrollBy({
          top: channelSection.getBoundingClientRect().top - HEADER_HEIGHT - HEADER_MARGIN,
          behavior: 'smooth',
        });
      }
    }, 0);
  }, [openIntegration, scrollTo]);

  return (
    <Modal
      withinPortal
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
        <Grid.Col lg={12}>
          {!isLoading ? (
            <>
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.IN_APP}
                providers={inAppProvider}
                title="In-App"
                onProviderClick={handleOnProviderClick}
              />
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.EMAIL}
                providers={emailProviders}
                title="Email"
                onProviderClick={handleOnProviderClick}
              />
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.SMS}
                providers={smsProvider}
                title="SMS"
                onProviderClick={handleOnProviderClick}
              />
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.CHAT}
                providers={chatProvider}
                title="Chat"
                onProviderClick={handleOnProviderClick}
              />
              <ChannelGroup
                selectedProvider={provider?.providerId}
                channel={ChannelTypeEnum.PUSH}
                providers={pushProvider}
                title="Push"
                onProviderClick={handleOnProviderClick}
              />
            </>
          ) : null}
        </Grid.Col>
        <Drawer
          opened={isFormOpened}
          position="right"
          onClose={handleCloseForm}
          withOverlay={false}
          withCloseButton={false}
          closeOnEscape={false}
          classNames={drawerClasses}
        >
          <IntegrationCardWrapper>
            <When truthy={provider && !provider?.novu && provider?.providerId !== InAppProviderIdEnum.Novu}>
              <ConnectIntegrationForm
                onClose={handleCloseForm}
                onSuccessFormSubmit={closeIntegration}
                key={provider?.providerId}
                provider={provider as IIntegratedProvider}
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
                <NovuInAppProviderModal showModal={closeIntegration} provider={provider} onClose={handleCloseForm} />
              </div>
            </When>
            <When truthy={provider?.providerId === SmsProviderIdEnum.Novu}>
              <div style={{ padding: '30px' }}>
                <NovuSmsProviderModal onClose={handleCloseForm} />
              </div>
            </When>
          </IntegrationCardWrapper>
        </Drawer>
      </Grid>
    </Modal>
  );
}
const DRAWER_PADDING = 40;
const DRAWER_PADDING_SMALL = 20;
const HEADER_HEIGHT_SMALL = 70;
const HEADER_HEIGHT = 90;
const HEADER_MARGIN = 10;
const DISTANCE_FROM_HEADER = 64;
const INTEGRATION_SETTING_TOP_SMALL = HEADER_HEIGHT_SMALL + HEADER_MARGIN;
const INTEGRATION_SETTING_TOP = HEADER_HEIGHT + HEADER_MARGIN + DISTANCE_FROM_HEADER;

const IntegrationCardWrapper = styled.div`
  position: sticky;
  box-sizing: border-box;
  padding: 0;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  height: calc(100vh - ${INTEGRATION_SETTING_TOP_SMALL + DRAWER_PADDING_SMALL}px);
  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
  border-radius: 7px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.B98)};
  overflow: hidden;

  @media screen and (min-width: 1367px) {
    top: ${INTEGRATION_SETTING_TOP}px;
    height: calc(100vh - ${INTEGRATION_SETTING_TOP + DRAWER_PADDING}px);
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
      marginRight: 0,
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

const useDrawerStyles = createStyles((theme: MantineTheme) => {
  return {
    drawer: {
      top: `${INTEGRATION_SETTING_TOP_SMALL - DRAWER_PADDING_SMALL}px`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'end',
      background: 'transparent',
      width: 660,
      padding: `${DRAWER_PADDING_SMALL}px !important`,
      boxShadow: 'none',

      '@media screen and (min-width: 1367px)': {
        top: `${INTEGRATION_SETTING_TOP - DRAWER_PADDING}px`,
        padding: `${DRAWER_PADDING}px !important`,
      },
    },
  };
});
