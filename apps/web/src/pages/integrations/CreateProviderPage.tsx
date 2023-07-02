import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IProviderConfig, providers } from '@novu/shared';
import { CreateProviderInstanceSidebar } from './components/multi-provider/CreateProviderInstanceSidebar';
import { SideBarWrapper } from './components/multi-provider/SelectProviderSidebar';

export function CreateProviderPage() {
  const { channel, providerId } = useParams();
  const navigate = useNavigate();
  const foundProvider = useMemo<IProviderConfig | undefined>(
    () => providers.find((provider) => provider.channel === channel && provider.id === providerId),
    [channel, providerId]
  );

  if (!foundProvider) {
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
        provider={foundProvider}
      />
    </SideBarWrapper>
  );
}
