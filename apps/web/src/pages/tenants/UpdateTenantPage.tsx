import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes.enum';
import { UpdateTenantSidebar } from './components/UpdateTenantSidebar';

export function UpdateTenantPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const onClose = () => {
    navigate(ROUTES.TENANTS);
  };

  if (!identifier) {
    navigate(ROUTES.TENANTS);

    return null;
  }

  return <UpdateTenantSidebar isOpened onClose={onClose} tenantIdentifier={identifier} />;
}
