import { useState } from 'react';
import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import { colors } from '../../design-system';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffectOnce } from '../../hooks';
import { useProviders } from './useProviders';
import { IIntegratedProvider } from './IntegrationsStoreModal';

export function UpdateProviderPage() {
  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const { providers } = useProviders();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { integrationId } = useParams();
  const navigate = useNavigate();

  useEffectOnce(() => {
    const foundProvider = providers.find((provider) => provider.integrationId === integrationId);

    if (foundProvider) {
      setSelectedProvider(foundProvider);
    }
  }, integrationId !== undefined && providers.length > 0);

  if (selectedProvider === null) {
    return null;
  }

  return <SideBarWrapper dark={isDark}></SideBarWrapper>;
}

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
