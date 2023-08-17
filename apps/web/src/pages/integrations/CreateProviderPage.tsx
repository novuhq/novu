import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { CreateProviderInstanceSidebar } from './components/multi-provider/CreateProviderInstanceSidebar';
import { ROUTES } from '../../constants/routes.enum';

export function CreateProviderPage() {
  const { channel, providerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const onIntegrationCreated = (integrationId: string) => {
    navigate(`/integrations/${integrationId}`);
  };

  return (
    <CreateProviderInstanceSidebar
      isOpened
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
      onIntegrationCreated={onIntegrationCreated}
      providerId={providerId}
      channel={channel}
    />
  );
}
