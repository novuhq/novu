// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { IntercomProvider } from 'react-use-intercom';
import { Outlet } from 'react-router-dom';

import { Toaster } from '@/components/primitives/sonner';
import { OptInProvider } from '@/context/opt-in-provider';
import { ProtectedRoute } from './protected-route';
import { INTERCOM_APP_ID } from '@/config';

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
