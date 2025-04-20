import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import { UpdateProviderSidebar } from './components/multi-provider/v2';

export function UpdateProviderPage() {
  const { integrationId } = useParams();
  const navigate = useNavigate();

  const onClose = () => {
    navigate(ROUTES.INTEGRATIONS);
  };

  return <UpdateProviderSidebar key={integrationId} isOpened onClose={onClose} integrationId={integrationId} />;
}
