import { useState } from 'react';
import styled from '@emotion/styled';
import { ActionIcon, ColorScheme, Group, Space, Stack, Tabs, TabsValue, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, providers } from '@novu/shared';
import { CONTEXT_PATH } from '../../../../config';
import { colors } from '../../../../design-system';
import { useDebounce } from '../../../../hooks';
import { Button, Input, Title, Tooltip, Text } from '../../../../design-system';
import { Search, Close } from '../../../../design-system/icons';
import { ChannelTitle } from '../../../templates/components/ChannelTitle';
import useStyles from '../../../../design-system/tabs/Tabs.styles';
import { IIntegratedProvider } from '../../IntegrationsStoreModal';
import { getGradient } from '../../../../design-system/config/helper';
import { useNavigate } from 'react-router-dom';
import { CHANNELS_ORDER } from '../IntegrationsListNoData';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';

const mapStructure = (listProv): IIntegratedProvider[] =>
  listProv.map((providerItem) => ({
    providerId: providerItem.id,
    displayName: providerItem.displayName,
    channel: providerItem.channel,
    docReference: providerItem.docReference,
  }));

const getLogoFileName = (id, schema: ColorScheme): string => {
  if (schema === 'dark') {
    return `${CONTEXT_PATH}/static/images/providers/dark/square/${id}.svg`;
  }

  return `${CONTEXT_PATH}/static/images/providers/light/square/${id}.svg`;
};

export function SelectProviderSidebar() {
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
  }, 500);

  const navigate = useNavigate();

  const onProviderClick = (provider) => () => setSelectedProvider(provider);

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

  const onCloseSidebar = () => {
    navigate('/integrations');
  };

  return (
    <SideBarWrapper>
      <FormStyled>
        <Group style={{ width: '100%' }} align="start" position="apart">
          <Stack>
            {selectedProvider !== null ? (
              <>
                <Group>
                  <ProviderImage providerId={selectedProvider.providerId} />
                  <Title size={2}>{selectedProvider.displayName}</Title>
                </Group>
                <Text color={colors.B40}>
                  A provider instance for {CHANNEL_TYPE_TO_STRING[selectedProvider.channel]} channel
                </Text>
              </>
            ) : (
              <>
                <Title size={2}>Select a provider</Title>
                <Text color={colors.B40}>Select a provider to create instance for a channel</Text>
              </>
            )}
          </Stack>
          <ActionIcon variant={'transparent'} onClick={onCloseSidebar}>
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
            {CHANNELS_ORDER.map((channelType) => {
              return (
                <Tabs.Tab key={channelType} value={channelType}>
                  <ChannelTitle spacing={5} channel={channelType} />
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
        <Space h={20} />
        <CenterDiv>
          <ListProviders
            selectedProvider={selectedProvider}
            onProviderClick={onProviderClick}
            channelProviders={inAppProviders}
            channelType={ChannelTypeEnum.IN_APP}
          />
          <ListProviders
            selectedProvider={selectedProvider}
            onProviderClick={onProviderClick}
            channelProviders={emailProviders}
            channelType={ChannelTypeEnum.EMAIL}
          />
          <ListProviders
            selectedProvider={selectedProvider}
            onProviderClick={onProviderClick}
            channelProviders={chatProviders}
            channelType={ChannelTypeEnum.CHAT}
          />
          <ListProviders
            selectedProvider={selectedProvider}
            onProviderClick={onProviderClick}
            channelProviders={pushProviders}
            channelType={ChannelTypeEnum.PUSH}
          />
          <ListProviders
            selectedProvider={selectedProvider}
            onProviderClick={onProviderClick}
            channelProviders={smsProviders}
            channelType={ChannelTypeEnum.SMS}
          />
        </CenterDiv>
        <Footer>
          <Group>
            <Button variant={'outline'} onClick={onCloseSidebar}>
              Cancel
            </Button>
            <Tooltip sx={{ position: 'absolute' }} disabled={selectedProvider !== null} label={'Select a provider'}>
              <span>
                <Button
                  disabled={selectedProvider === null}
                  onClick={() => {
                    if (selectedProvider === null) {
                      return;
                    }
                    navigate(`/integrations/create/${selectedProvider?.channel}/${selectedProvider?.providerId}`);
                  }}
                >
                  Next
                </Button>
              </span>
            </Tooltip>
          </Group>
        </Footer>
      </FormStyled>
    </SideBarWrapper>
  );
}

export const ProviderImage = ({ providerId }) => {
  const { colorScheme } = useMantineColorScheme();

  return (
    <img
      src={getLogoFileName(providerId, colorScheme)}
      alt={providerId}
      style={{
        height: '24px',
        maxWidth: '140px',
      }}
    />
  );
};

const ListProviders = ({
  channelProviders,
  channelType,
  onProviderClick,
  selectedProvider,
}: {
  channelProviders: IIntegratedProvider[];
  channelType: ChannelTypeEnum;
  onProviderClick: (provider: IIntegratedProvider) => () => void;
  selectedProvider: IIntegratedProvider | null;
}) => {
  return (
    <Stack pb={20} spacing={10} id={channelType}>
      <ChannelTitle spacing={8} channel={channelType} />
      <div>
        {channelProviders.map((provider) => {
          return (
            <StyledButton
              key={provider.providerId}
              onClick={onProviderClick(provider)}
              selected={provider.providerId === selectedProvider?.providerId}
            >
              <Group>
                <ProviderImage providerId={provider.providerId} />
                <Text>{provider.displayName}</Text>
              </Group>
            </StyledButton>
          );
        })}
      </div>
    </Stack>
  );
};
export const Footer = styled.div`
  padding: 15px;
  height: 80px;
  display: flex;
  justify-content: right;
  align-items: center;
  gap: 20px;
`;

const CenterDiv = styled.div`
  overflow: auto;
  color: ${colors.B60};
  font-size: 14px;
  line-height: 20px;
`;

export const FormStyled = styled.form`
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

  ${({ selected, theme }) => {
    return selected
      ? `
           background: ${
             theme.colorScheme === 'dark' ? getGradient(colors.B20) : getGradient(colors.B98)
           } padding-box, ${colors.horizontal} border-box;
      `
      : undefined;
  }};
`;

export const SideBarWrapper = styled.div`
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)} !important;
  position: absolute;
  z-index: 1;
  width: 480px;
  top: 0;
  bottom: 0;
  right: 0;
  padding: 24px;
`;
