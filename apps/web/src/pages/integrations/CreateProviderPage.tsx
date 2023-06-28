import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffectOnce } from '../../hooks';
import { IProviderConfig, providers } from '@novu/shared';
import { CreateProviderInstanceSidebar } from './components/multi-provider/CreateProviderInstanceSidebar';
import { SideBarWrapper } from './components/multi-provider/SelectProviderSidebar';

export function CreateProviderPage() {
  const [selectedProvider, setSelectedProvider] = useState<IProviderConfig | null>(null);
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
    <SideBarWrapper>
      <CreateProviderInstanceSidebar
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
