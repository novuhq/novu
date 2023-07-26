import { useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '../../constants/routes.enum';
import { UpdateTenantSidebar } from './components/UpdateTenantSidebar';

export function UpdateTenantPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const onClose = () => {
    navigate(ROUTES.TENANTS);
  };

  return <UpdateTenantSidebar isOpened onClose={onClose} tenantIdentifier={identifier} />;
}
