import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes.enum';
import { CreateTenantSidebar } from './components/CreateTenantSidebar';

export function CreateTenantPage() {
  const navigate = useNavigate();

  const onClose = () => {
    navigate(ROUTES.TENANTS);
  };

  const onTenantCreated = (identifier: string) => {
    navigate(`${ROUTES.TENANTS}/${identifier}`);
  };

  return <CreateTenantSidebar isOpened onTenantCreated={onTenantCreated} onClose={onClose} />;
}
