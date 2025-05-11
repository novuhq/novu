import { Toaster } from '@/components/primitives/sonner';
import { OptInProvider } from '@/context/opt-in-provider';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <OptInProvider>
        <Outlet />
        <Toaster />
      </OptInProvider>
    </ProtectedRoute>
  );
};
