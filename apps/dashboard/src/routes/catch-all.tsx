import { Navigate } from 'react-router-dom';
import { getEnvironmentId } from '@/utils/environment';
import { buildRoute, ROUTES } from '@/utils/routes';

export const CatchAllRoute = () => {
  const environmentId = getEnvironmentId();

  return <Navigate to={environmentId ? buildRoute(ROUTES.WORKFLOWS, { environmentId }) : ROUTES.ENV} />;
};
