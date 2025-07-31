import { Outlet } from 'react-router-dom';
// @ts-ignore
import { IntercomProvider } from 'react-use-intercom';

import { Toaster } from '@/components/primitives/sonner';
import { INTERCOM_APP_ID } from '@/config';
import { OptInProvider } from '@/context/opt-in-provider';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <OptInProvider>
          <Outlet />
          <Toaster />
        </OptInProvider>
      </IntercomProvider>
    </ProtectedRoute>
  );
};
