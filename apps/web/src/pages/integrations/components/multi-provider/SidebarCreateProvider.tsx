import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import {
  ActionIcon,
  Container,
  createStyles,
  Drawer,
  Group,
  MantineTheme,
  Space,
  Stack,
  Tabs,
  TabsValue,
  Text,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import { ChannelTypeEnum, IProviderConfig, providers } from '@novu/shared';
import { CONTEXT_PATH } from '../../../../config';
import { colors } from '../../../../design-system';
import { useDebounce } from '../../../../hooks';
import { Button, Input, Title, Tooltip } from '../../../../design-system';
import { Chat, InApp, Mail, Mobile, Search, Sms, Close } from '../../../../design-system/icons';
import { ChannelTitle } from '../../../templates/components/ChannelTitle';
import useStyles from '../../../../design-system/tabs/Tabs.styles';
import { IIntegratedProvider } from '../../IntegrationsStoreModal';
import { When } from '../../../../components/utils/When';
import { SidebarCreateProviderConditions } from './SidebarCreateProviderConditions';
import { getGradient } from '../../../../design-system/config/helper';

const mapStructure = (listProv) => {
  return listProv.map((providerItem) => {
    const logoFileName = {
      light: `${CONTEXT_PATH}/static/images/providers/light/square/${providerItem.id}.svg`,
      dark: `${CONTEXT_PATH}/static/images/providers/dark/square/${providerItem.id}.svg`,
    };

    return {
      providerId: providerItem.id,
      displayName: providerItem.displayName,
      channel: providerItem.channel,
      docReference: providerItem.docReference,
      logoFileName,
    };
  });
};

const SELECT_PROVIDER = 'selectProvider';
const CREATE_INSTANCE = 'createInstance';
const UPDATE_INSTANCE = 'updateInstance';

export function SidebarCreateProvider({ open, onClose }: { open: boolean; onClose: () => void }) {
  // const { emailProviders, smsProvider, chatProvider, pushProvider, inAppProvider, isLoading, refetch } = useProviders();
  const [{ emailProviders, smsProviders, chatProviders, pushProviders, inAppProviders }, setProviders] = useState({
    emailProviders: mapStructure(
      providers.filter((providerItem) => providerItem.channel === ChannelTypeEnum.EMAIL) || []
    ),
    smsProviders: mapStructure(providers.filter((providerItem) => providerItem.channel === ChannelTypeEnum.SMS) || []),
    pushProviders: mapStructure(
      providers.filter((providerItem) => providerItem.channel === ChannelTypeEnum.PUSH) || []
    ),
    inAppProviders: mapStructure(
      providers.filter((providerItem) => providerItem.channel === ChannelTypeEnum.IN_APP) || []
    ),
    chatProviders: mapStructure(
      providers.filter((providerItem) => providerItem.channel === ChannelTypeEnum.CHAT) || []
    ),
  });
  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const [scrollTo, setScrollTo] = useState<string | null>(ChannelTypeEnum.IN_APP);
  const [stepShown, setStepShown] = useState<'selectProvider' | 'createInstance' | 'updateInstance'>(SELECT_PROVIDER);
  const { classes: drawerClasses } = useDrawerStyles();
  const { classes: tabsClasses } = useStyles(false);
  const filterSearch = (list, search: string) =>
    list.filter((prov) => prov.displayName.toLowerCase().includes(search.toLowerCase()));
  const debouncedSearchChange = useDebounce((search: string) => {
    setProviders({
      emailProviders: filterSearch(emailProviders, search),
      smsProviders: filterSearch(smsProviders, search),
      pushProviders: filterSearch(pushProviders, search),
      inAppProviders: filterSearch(inAppProviders, search),
      chatProviders: filterSearch(chatProviders, search),
    });
    // console.log(temp);
  }, 500);

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!scrollTo) return;

    setTimeout(() => {
      const channelSection = document.getElementById(scrollTo);
      const modalContainer = document.querySelector('.mantine-Drawer-drawer');
      if (channelSection && modalContainer) {
        modalContainer.scrollBy({
          top: channelSection.getBoundingClientRect().top - HEADER_HEIGHT - HEADER_MARGIN,
          behavior: 'smooth',
        });
      }
    }, 0);
  }, [scrollTo]);

  return (
    <Drawer
      opened={open}
      position="right"
      withOverlay={false}
      withCloseButton={false}
      closeOnEscape={false}
      onClose={onClose}
      classNames={drawerClasses}
    >
      <When truthy={stepShown === SELECT_PROVIDER}>
        <FormStyled>
          <Group style={{ width: '100%' }} position={'apart'}>
            <Stack>
              {selectedProvider !== null ? (
                <>
                  <Group>
                    <img
                      src={selectedProvider.logoFileName[`${colorScheme}`]}
                      alt={selectedProvider.displayName}
                      style={{
                        height: '24px',
                        maxWidth: '140px',
                      }}
                    />

                    <Title>{selectedProvider.displayName}</Title>
                  </Group>
                  <Text color={colors.B40}>A provider instance for {selectedProvider.channel} channel</Text>
                </>
              ) : (
                <>
                  <Title>Select a provider</Title>
                  <Text color={colors.B40}>Select a provider to create instance for a channel</Text>
                </>
              )}
            </Stack>
            <ActionIcon variant={'transparent'} onClick={onClose}>
              <Close color={colors.B40} />
            </ActionIcon>
          </Group>
          <Input
            type={'search'}
            onChange={(e) => {
              debouncedSearchChange(e.target.value);
            }}
            my={20}
            placeholder={'Search a provider...'}
            rightSection={<Search />}
          />
          <Tabs
            defaultValue={ChannelTypeEnum.IN_APP}
            classNames={tabsClasses}
            onTabChange={(value: TabsValue) => setScrollTo(value)}
          >
            <Tabs.List>
              <Tabs.Tab value={ChannelTypeEnum.IN_APP}>
                <Group spacing={5}>
                  <InApp /> <span>In-App</span>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value={ChannelTypeEnum.EMAIL}>
                <Group spacing={5}>
                  <Mail /> <span>Email</span>
                </Group>
              </Tabs.Tab>

              <Tabs.Tab value={ChannelTypeEnum.SMS}>
                <Group spacing={5}>
                  <Sms /> <span>SMS</span>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value={ChannelTypeEnum.CHAT}>
                <Group spacing={5}>
                  <Chat /> <span>Chat</span>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value={ChannelTypeEnum.PUSH}>
                <Group spacing={5}>
                  <Mobile /> <span>Push</span>
                </Group>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Space h={20} />

          <CenterDiv>
            <div
              style={{
                color: colors.B60,
                // marginBottom: 12,
                fontSize: 14,
                lineHeight: '20px',
              }}
            >
              <Stack pb={20} spacing={10} id={ChannelTypeEnum.IN_APP}>
                <ChannelTitle spacing={8} channel={ChannelTypeEnum.IN_APP} />
                <div>
                  {inAppProviders?.map((providerEx) => {
                    return (
                      <StyledButton
                        key={providerEx.providerId}
                        onClick={() => setSelectedProvider(providerEx)}
                        selected={providerEx.providerId === selectedProvider?.providerId}
                      >
                        <Group>
                          <img
                            src={providerEx.logoFileName[`${colorScheme}`]}
                            alt={providerEx.displayName}
                            style={{
                              height: '24px',
                              maxWidth: '140px',
                            }}
                          />
                          <Text>{providerEx.displayName}</Text>
                        </Group>
                      </StyledButton>
                    );
                  })}
                </div>
              </Stack>
              <Stack pb={20} spacing={10} id={ChannelTypeEnum.EMAIL}>
                <ChannelTitle spacing={8} channel={ChannelTypeEnum.EMAIL} />
                <div>
                  {emailProviders.map((providerEx) => {
                    return (
                      <StyledButton
                        key={providerEx.providerId}
                        onClick={() => setSelectedProvider(providerEx)}
                        selected={providerEx.providerId === selectedProvider?.providerId}
                      >
                        <Group>
                          <img
                            src={providerEx.logoFileName[`${colorScheme}`]}
                            alt={providerEx.displayName}
                            style={{
                              height: '24px',
                              maxWidth: '140px',
                              // opacity: providerEx.active ? 1 : colorScheme === 'dark' ? 0.4 : 1,
                            }}
                          />
                          <Text>{providerEx.displayName}</Text>
                        </Group>
                      </StyledButton>
                    );
                  })}
                </div>
              </Stack>
              <Stack id={'chat'} py={20} spacing={10}>
                <ChannelTitle spacing={8} channel={ChannelTypeEnum.CHAT} />
                <div>
                  {chatProviders.map((providerEx) => {
                    return (
                      <StyledButton
                        key={providerEx.providerId}
                        onClick={() => setSelectedProvider(providerEx)}
                        selected={providerEx.providerId === selectedProvider?.providerId}
                      >
                        <Group>
                          <img
                            src={providerEx.logoFileName[`${colorScheme}`]}
                            alt={providerEx.displayName}
                            style={{
                              height: '24px',
                              maxWidth: '140px',
                            }}
                          />
                          <Text>{providerEx.displayName}</Text>
                        </Group>
                      </StyledButton>
                    );
                  })}
                </div>
              </Stack>
              <Stack py={20} spacing={10} id={ChannelTypeEnum.SMS}>
                <ChannelTitle spacing={8} channel={ChannelTypeEnum.SMS} />
                <div>
                  {smsProviders.map((providerEx) => {
                    return (
                      <StyledButton
                        key={providerEx.providerId}
                        onClick={() => setSelectedProvider(providerEx)}
                        selected={providerEx.providerId === selectedProvider?.providerId}
                      >
                        <Group>
                          <img
                            src={providerEx.logoFileName[`${colorScheme}`]}
                            alt={providerEx.displayName}
                            style={{
                              height: '24px',
                              maxWidth: '140px',
                            }}
                          />
                          <Text>{providerEx.displayName}</Text>
                        </Group>
                      </StyledButton>
                    );
                  })}
                </div>
              </Stack>
              <Stack py={20} spacing={10} id={ChannelTypeEnum.PUSH}>
                <ChannelTitle spacing={8} channel={ChannelTypeEnum.PUSH} />
                <div>
                  {pushProviders.map((providerEx) => {
                    return (
                      <StyledButton
                        key={providerEx.providerId}
                        onClick={() => setSelectedProvider(providerEx)}
                        selected={providerEx.providerId === selectedProvider?.providerId}
                      >
                        <Group>
                          <img
                            src={providerEx.logoFileName[`${colorScheme}`]}
                            alt={providerEx.displayName}
                            style={{
                              height: '24px',
                              maxWidth: '140px',
                            }}
                          />
                          <Text>{providerEx.displayName}</Text>
                        </Group>
                      </StyledButton>
                    );
                  })}
                </div>
              </Stack>
            </div>
          </CenterDiv>
          <Footer>
            <Group>
              <Button variant={'outline'} onClick={onClose}>
                Cancel
              </Button>
              <Tooltip sx={{ position: 'absolute' }} disabled={selectedProvider !== null} label={'Select a provider'}>
                <span>
                  <Button disabled={selectedProvider === null} onClick={() => setStepShown(CREATE_INSTANCE)}>
                    Next
                  </Button>
                </span>
              </Tooltip>
            </Group>
          </Footer>
        </FormStyled>
      </When>
      <When truthy={stepShown === CREATE_INSTANCE && selectedProvider !== null}>
        <SidebarCreateProviderConditions
          goBack={() => setStepShown(SELECT_PROVIDER)}
          onClose={onClose}
          provider={selectedProvider as IIntegratedProvider}
        />
      </When>
      <When truthy={stepShown === UPDATE_INSTANCE && selectedProvider !== null}>
        <SidebarCreateProviderConditions
          goBack={() => setStepShown(SELECT_PROVIDER)}
          onClose={onClose}
          provider={selectedProvider as IIntegratedProvider}
        />
      </When>
    </Drawer>
  );
}

const Footer = styled.div`
  padding: 15px;
  height: 80px;
  display: flex;
  justify-content: right;
  align-items: center;
  gap: 20px;
`;

const CenterDiv = styled.div`
  //overflow: hidden;
  overflow: auto;
  color: ${colors.white};
  //padding: 30px;
  //padding: 30px;

  //height: 80%;
`;

const DRAWER_PADDING = 30;
const DRAWER_PADDING_SMALL = 20;
const HEADER_HEIGHT_SMALL = 70;
// const HEADER_HEIGHT = 90;
const HEADER_HEIGHT = 65;
const HEADER_MARGIN = 10;
const DISTANCE_FROM_HEADER = 64;
const INTEGRATION_SETTING_TOP_SMALL = HEADER_HEIGHT_SMALL + HEADER_MARGIN;
const INTEGRATION_SETTING_TOP = HEADER_HEIGHT + HEADER_MARGIN + DISTANCE_FROM_HEADER;

const useDrawerStyles = createStyles((theme: MantineTheme) => {
  return {
    drawer: {
      // top: 0,
      top: `${HEADER_HEIGHT + DRAWER_PADDING}px`,
      // top: `${INTEGRATION_SETTING_TOP_SMALL - DRAWER_PADDING_SMALL}px`,
      display: 'flex',
      flexDirection: 'column',
      marginRight: '30px',
      // justifyContent: 'end',
      height: `calc(100vh - ${INTEGRATION_SETTING_TOP_SMALL + DRAWER_PADDING_SMALL}px)`,

      overflow: 'auto',
      borderRadius: '0 7px 7px 0 ',
      // overflow: 'hidden',
      background: colors.B17,
      width: 480,
      // height: 800,
      padding: `${DRAWER_PADDING_SMALL}px !important`,
      boxShadow: 'none',

      '@media screen and (min-width: 1367px)': {
        top: `${HEADER_HEIGHT + DRAWER_PADDING}px`,
        // top: `${INTEGRATION_SETTING_TOP - DRAWER_PADDING}px`,
        height: `calc(100vh - ${INTEGRATION_SETTING_TOP + DRAWER_PADDING}px)`,

        padding: `${DRAWER_PADDING}px !important`,
      },
    },
  };
});

const FormStyled = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;

  > *:last-child {
    margin-top: auto;
  }
`;

const StyledButton = styled.div<{ selected: boolean }>`
  width: 100%;
  padding: 15px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.B98)};
  border-radius: 8px;

  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  border: 1px solid transparent;

  margin-bottom: 12px;
  line-height: 1;

  ${({ selected }) => {
    return selected
      ? `
           background: ${getGradient(colors.B20)} padding-box, ${colors.horizontal} border-box;
      `
      : undefined;
  }};
`;
