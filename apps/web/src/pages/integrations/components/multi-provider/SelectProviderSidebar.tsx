import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { Group, Image, Space, Stack, Tabs, TabsValue, useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import {
  colors,
  Sidebar,
  Button,
  Input,
  Title,
  Tooltip,
  Text,
  getGradient,
  Search,
  useTabsStyles,
} from '@novu/design-system';

import { useDebounce } from '../../../../hooks';
import { ChannelTitle } from '../../../templates/components/ChannelTitle';
import type { IIntegratedProvider } from '../../types';
import { CHANNELS_ORDER } from '../IntegrationsListNoData';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import { getLogoFileName, initialProvidersList } from '../../../../utils/providers';
import { sortProviders } from './sort-providers';
import { When } from '../../../../components/utils/When';
import { CONTEXT_PATH } from '../../../../config';
import { useProviders } from '../../useProviders';

const filterSearch = (list, search: string) =>
  list.filter((prov) => prov.displayName.toLowerCase().includes(search.toLowerCase()));

export function SelectProviderSidebar({
  scrollTo,
  isOpened,
  onClose,
  onNextStepClick,
}: {
  scrollTo?: ChannelTypeEnum;
  isOpened: boolean;
  onClose: () => void;
  onNextStepClick: (selectedProvider: IIntegratedProvider) => void;
}) {
  const [providersList, setProvidersList] = useState(initialProvidersList);
  const [selectedTab, setSelectedTab] = useState(ChannelTypeEnum.IN_APP);
  const { isLoading: isIntegrationsLoading, providers: integrations } = useProviders();

  const inAppCount: number = useMemo(() => {
    const count = integrations.filter(
      (integration) =>
        integration.channel === ChannelTypeEnum.IN_APP && integration.providerId === InAppProviderIdEnum.Novu
    ).length;

    if (count === 2) {
      setSelectedTab(ChannelTypeEnum.EMAIL);
    }

    return count;
  }, [integrations]);

  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const { classes: tabsClasses } = useTabsStyles(false);

  const debouncedSearchChange = useDebounce((search: string) => {
    setProvidersList({
      [ChannelTypeEnum.EMAIL]: filterSearch(providersList[ChannelTypeEnum.EMAIL], search),
      [ChannelTypeEnum.SMS]: filterSearch(providersList[ChannelTypeEnum.SMS], search),
      [ChannelTypeEnum.PUSH]: filterSearch(providersList[ChannelTypeEnum.PUSH], search),
      [ChannelTypeEnum.IN_APP]: filterSearch(providersList[ChannelTypeEnum.IN_APP], search),
      [ChannelTypeEnum.CHAT]: filterSearch(providersList[ChannelTypeEnum.CHAT], search),
    });
  }, 500);

  const emptyProvidersList = Object.values(providersList).every((list) => list.length === 0);

  const onProviderClick = (provider) => () => setSelectedProvider(provider);

  const onTabChange = useCallback(
    (elementId?: TabsValue) => {
      if (!elementId) {
        return;
      }

      setSelectedTab(elementId as ChannelTypeEnum);

      const element = document.getElementById(elementId);

      element?.parentElement?.scrollTo({
        behavior: 'smooth',
        top: element?.offsetTop ? element?.offsetTop - 250 : undefined,
      });
    },
    [setSelectedTab]
  );

  const onSidebarClose = () => {
    onClose();
    setProvidersList(initialProvidersList);
    setSelectedTab(inAppCount < 2 ? ChannelTypeEnum.IN_APP : ChannelTypeEnum.EMAIL);
  };

  useEffect(() => {
    onTabChange(scrollTo?.toString());
  }, [onTabChange, scrollTo]);

  return (
    <Sidebar
      isOpened={isOpened}
      isLoading={isIntegrationsLoading}
      onClose={onSidebarClose}
      customHeader={
        <Stack spacing={8}>
          {selectedProvider !== null ? (
            <>
              <Group spacing={12} h={40}>
                <ProviderImage providerId={selectedProvider.providerId} />
                <Title size={2} data-test-id="selected-provider-name">
                  {selectedProvider.displayName}
                </Title>
              </Group>
              <Text color={colors.B40}>
                A provider instance for {CHANNEL_TYPE_TO_STRING[selectedProvider.channel]} channel
              </Text>
            </>
          ) : (
            <>
              <Group h={40}>
                <Title size={2}>Select a provider</Title>
              </Group>
              <Text color={colors.B40}>Select a provider to create instance for a channel</Text>
            </>
          )}
        </Stack>
      }
      customFooter={
        <Group ml="auto">
          <Button variant={'outline'} onClick={onSidebarClose} data-test-id="select-provider-sidebar-cancel">
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
                  onNextStepClick(selectedProvider);
                }}
                data-test-id="select-provider-sidebar-next"
              >
                Next
              </Button>
            </span>
          </Tooltip>
        </Group>
      }
      data-test-id="select-provider-sidebar"
    >
      <SelectProviderBodyContainer>
        <Input
          type={'search'}
          onChange={(e) => {
            debouncedSearchChange(e.target.value);
          }}
          mb={20}
          placeholder={'Search a provider...'}
          rightSection={<Search />}
        />
        <Tabs classNames={tabsClasses} onTabChange={onTabChange} value={selectedTab}>
          <Tabs.List>
            {CHANNELS_ORDER.map((channelType) => {
              const list = providersList[channelType];

              return (
                <Tabs.Tab
                  key={channelType}
                  hidden={list.length === 0 || (channelType === ChannelTypeEnum.IN_APP && inAppCount === 2)}
                  value={channelType}
                >
                  <ChannelTitle spacing={5} channel={channelType} />
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
        <Space h={20} />
        <CenterDiv>
          <When truthy={emptyProvidersList}>
            <Image
              src={`${CONTEXT_PATH}/static/images/empty-provider-search.svg`}
              data-test-id="select-provider-no-search-results-img"
            />
          </When>
          {!emptyProvidersList &&
            CHANNELS_ORDER.map((channelType) => {
              return (
                <ListProviders
                  key={channelType}
                  selectedProvider={selectedProvider}
                  onProviderClick={onProviderClick}
                  channelProviders={
                    channelType === ChannelTypeEnum.IN_APP && inAppCount === 2 ? [] : providersList[channelType]
                  }
                  channelType={channelType}
                />
              );
            })}
        </CenterDiv>
      </SelectProviderBodyContainer>
    </Sidebar>
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
        maxWidth: '24px',
        width: '24px',
      }}
      data-test-id={`selected-provider-image-${providerId}`}
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
  const providers = useMemo(() => {
    return channelProviders.sort(sortProviders(channelType));
  }, [channelProviders, channelType]);

  return (
    <Stack
      hidden={providers.length === 0}
      pb={20}
      spacing={10}
      id={channelType}
      data-test-id={`providers-group-${channelType}`}
    >
      <ChannelTitle spacing={8} channel={channelType} />
      <div>
        {providers.map((provider) => {
          return (
            <StyledButton
              key={provider.providerId}
              onClick={onProviderClick(provider)}
              selected={provider.providerId === selectedProvider?.providerId}
              data-test-id={`provider-${provider.providerId}`}
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
  display: flex;
  justify-content: right;
  align-items: center;
`;

const CenterDiv = styled.div`
  overflow: auto;
  color: ${colors.B60};
  font-size: 14px;
  line-height: 20px;
`;

const SelectProviderBodyContainer = styled.form`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
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
  &:hover {
    cursor: pointer;
  }

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
