import { Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, ClerkProvider, SegmentProvider } from '@/context';
import { HelmetProvider } from 'react-helmet-async';

const queryClient = new QueryClient();

export const RootRoute = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider>
        <SegmentProvider>
          <AuthProvider>
            <HelmetProvider>
              <Outlet />
            </HelmetProvider>
          </AuthProvider>
        </SegmentProvider>
      </ClerkProvider>
    </QueryClientProvider>
  );
};
