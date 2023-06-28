import { useState } from 'react';
import styled from '@emotion/styled';
import { useMantineColorScheme } from '@mantine/core';
import { colors } from '../../design-system';
import { SidebarCreateProviderConditions } from './components/multi-provider/SidebarCreateProviderConditions';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffectOnce } from '../../hooks';
import { IProviderConfig, providers } from '@novu/shared';

export function CreateProviderPage() {
  const [selectedProvider, setSelectedProvider] = useState<IProviderConfig | null>(null);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { channel, providerId } = useParams();
  const navigate = useNavigate();

  useEffectOnce(() => {
    const foundProvider = providers.find((provider) => provider.channel === channel && provider.id === providerId);

    if (foundProvider) {
      setSelectedProvider(foundProvider);
    }
  }, channel !== undefined && providerId !== undefined);

  if (selectedProvider === null) {
    return null;
  }

  return (
    <SideBarWrapper dark={isDark}>
      <SidebarCreateProviderConditions
        goBack={() => {
          navigate('/integrations/create');
        }}
        onClose={() => {
          navigate('/integrations');
        }}
        provider={selectedProvider}
      />
    </SideBarWrapper>
  );
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
