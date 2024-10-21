import { Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { SegmentProvider } from '@/context/segment';
import { AuthProvider } from '@/context/auth/auth-provider';
import { ClerkProvider } from '@/context/clerk-provider';

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
