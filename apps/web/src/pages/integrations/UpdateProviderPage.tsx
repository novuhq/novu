import { useNavigate, useParams, useLocation } from 'react-router-dom';

import { ROUTES } from '../../constants/routes.enum';
import { UpdateProviderSidebar } from './components/multi-provider/UpdateProviderSidebar';

export function UpdateProviderPage() {
  const { integrationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasSelectPrimaryProvider }: { hasSelectPrimaryProvider: boolean } = (location.state as any) ?? {
    hasSelectPrimaryProvider: false,
  };

  const onClose = () => {
    navigate(ROUTES.INTEGRATIONS);
  };

  return (
    <UpdateProviderSidebar
      isOpened
      onClose={onClose}
      integrationId={integrationId}
      hasToSelectPrimaryProvider={hasSelectPrimaryProvider}
    />
  );
}
