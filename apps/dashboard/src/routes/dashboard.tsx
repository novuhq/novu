import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
};
