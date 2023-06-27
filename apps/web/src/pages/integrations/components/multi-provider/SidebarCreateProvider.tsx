import { useCallback, useState } from 'react';
import styled from '@emotion/styled';
import {
  ActionIcon,
  ColorScheme,
  Group,
  Space,
  Stack,
  Tabs,
  TabsValue,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
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
import { useProviders } from '../../useProviders';

const getLogoFileName = (id, schema: ColorScheme) => {
  if (schema === 'dark') {
    return `${CONTEXT_PATH}/static/images/providers/dark/square/${id}.svg`;
  }

  return `${CONTEXT_PATH}/static/images/providers/light/square/${id}.svg`;
};

const SELECT_PROVIDER = 'selectProvider';
const CREATE_INSTANCE = 'createInstance';
const UPDATE_INSTANCE = 'updateInstance';

export function SidebarCreateProvider({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { emailProviders: emailProvider, smsProvider, chatProvider, pushProvider, inAppProvider } = useProviders();

  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const [stepShown, setStepShown] = useState<'selectProvider' | 'createInstance' | 'updateInstance'>(SELECT_PROVIDER);
  const { classes: tabsClasses } = useStyles(false);
  const [search, setSearch] = useState<string | undefined>();
  const filterSearch = useCallback(
    (prov) => (search ? prov.displayName.toLowerCase().includes(search.toLowerCase()) : true),
    [search]
  );
  const debouncedSearchChange = useDebounce((value: string) => {
    setSearch(value);
  }, 250);

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const onTabChange = (scrollTo: TabsValue) => {
    if (scrollTo === null) {
      return;
    }

    document.getElementById(scrollTo)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  };

  if (!open) {
    return null;
  }

  return (
    <SideBarWrapper dark={isDark}>
      <When truthy={stepShown === SELECT_PROVIDER}>
        <FormStyled>
          <Group style={{ width: '100%' }} align="start" position="apart">
            <Stack>
              {selectedProvider !== null ? (
                <>
                  <Group>
                    <img
                      src={getLogoFileName(selectedProvider.providerId, colorScheme)}
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
          <Tabs defaultValue={ChannelTypeEnum.IN_APP} classNames={tabsClasses} onTabChange={onTabChange}>
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
            <Stack pb={20} spacing={10} id={ChannelTypeEnum.IN_APP}>
              <ChannelTitle spacing={8} channel={ChannelTypeEnum.IN_APP} />
              <div>
                {inAppProvider?.filter(filterSearch).map((providerEx) => {
                  return (
                    <StyledButton
                      key={providerEx.providerId}
                      onClick={() => setSelectedProvider(providerEx)}
                      selected={providerEx.providerId === selectedProvider?.providerId}
                    >
                      <Group>
                        <img
                          src={getLogoFileName(providerEx.providerId, colorScheme)}
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
                {emailProvider.filter(filterSearch).map((providerEx) => {
                  return (
                    <StyledButton
                      key={providerEx.providerId}
                      onClick={() => setSelectedProvider(providerEx)}
                      selected={providerEx.providerId === selectedProvider?.providerId}
                    >
                      <Group>
                        <img
                          src={getLogoFileName(providerEx.providerId, colorScheme)}
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
            <Stack py={20} spacing={10} id={ChannelTypeEnum.CHAT}>
              <ChannelTitle spacing={8} channel={ChannelTypeEnum.CHAT} />
              <div>
                {chatProvider.filter(filterSearch).map((providerEx) => {
                  return (
                    <StyledButton
                      key={providerEx.providerId}
                      onClick={() => setSelectedProvider(providerEx)}
                      selected={providerEx.providerId === selectedProvider?.providerId}
                    >
                      <Group>
                        <img
                          src={getLogoFileName(providerEx.providerId, colorScheme)}
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
                {smsProvider.filter(filterSearch).map((providerEx) => {
                  return (
                    <StyledButton
                      key={providerEx.providerId}
                      onClick={() => setSelectedProvider(providerEx)}
                      selected={providerEx.providerId === selectedProvider?.providerId}
                    >
                      <Group>
                        <img
                          src={getLogoFileName(providerEx.providerId, colorScheme)}
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
                {pushProvider.filter(filterSearch).map((providerEx) => {
                  return (
                    <StyledButton
                      key={providerEx.providerId}
                      onClick={() => setSelectedProvider(providerEx)}
                      selected={providerEx.providerId === selectedProvider?.providerId}
                    >
                      <Group>
                        <img
                          src={getLogoFileName(providerEx.providerId, colorScheme)}
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
    </SideBarWrapper>
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
  overflow: auto;
  color: ${colors.white};
  color: ${colors.B60};
  font-size: 14px;
  line-height: 20px;
`;

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

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)} !important;
  position: absolute;
  z-index: 1;
  width: 480px;
  top: 0;
  bottom: 0;
  right: 0;
  padding: 24px;
`;
