import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { IProviderConfig, providers } from '@novu/shared';

import { CreateProviderInstanceSidebar } from './components/multi-provider/CreateProviderInstanceSidebar';
import { ROUTES } from '../../constants/routes.enum';

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
        if (location.pathname.includes(`${ROUTES.INTEGRATIONS_CREATE}/`)) {
          navigate(ROUTES.INTEGRATIONS_CREATE);

          return;
        }

        navigate(ROUTES.INTEGRATIONS);
      }}
      onClose={() => {
        navigate(ROUTES.INTEGRATIONS);
      }}
      provider={foundProvider}
    />
  );
}
