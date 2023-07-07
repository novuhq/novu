import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IProviderConfig, providers } from '@novu/shared';
import { CreateProviderInstanceSidebar } from './components/multi-provider/CreateProviderInstanceSidebar';

export function CreateProviderPage() {
  const { channel, providerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const foundProvider = useMemo<IProviderConfig | undefined>(
    () => providers.find((provider) => provider.channel === channel && provider.id === providerId),
    [channel, providerId]
  );

  if (!foundProvider) {
    return null;
  }

  return (
    <CreateProviderInstanceSidebar
      onGoBack={() => {
        if (location.pathname.includes('/integrations/create/')) {
          navigate('/integrations/create');

          return;
        }

        navigate('/integrations');
      }}
      onClose={() => {
        navigate('/integrations');
      }}
      provider={foundProvider}
    />
  );
}
