import { ROUTES } from '@/utils/routes';
import { Navigate } from 'react-router-dom';

export const CatchAllRoute = () => {
  return <Navigate to={ROUTES.WORKFLOWS} />;
};
