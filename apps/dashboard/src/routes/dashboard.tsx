import { Toaster } from '@/components/primitives/sonner';
import { TopicEventsProvider } from '@/components/topics/hooks/use-topic-events';
import { OptInProvider } from '@/context/opt-in-provider';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <OptInProvider>
        <TopicEventsProvider>
          <Outlet />
          <Toaster />
        </TopicEventsProvider>
      </OptInProvider>
    </ProtectedRoute>
  );
};
