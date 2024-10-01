import { Outlet } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
};
