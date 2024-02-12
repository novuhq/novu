import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes.enum';
import { UpdateProviderSidebar } from './components/multi-provider/UpdateProviderSidebar';

export function UpdateProviderPage() {
  const { integrationId } = useParams();
  const navigate = useNavigate();

  const onClose = () => {
    navigate(ROUTES.INTEGRATIONS);
  };

  return <UpdateProviderSidebar key={integrationId} isOpened onClose={onClose} integrationId={integrationId} />;
}
