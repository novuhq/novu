import { CONTEXT_PATH, SegmentProvider } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { api } from './api/api.client';
import { AuthProvider } from './components/providers/AuthProvider';
import { LaunchDarklyProvider } from './LaunchDarklyProvider';

const defaultQueryFn = async ({ queryKey }: { queryKey: string }) => {
  const response = await api.get(`${queryKey[0]}`);

  return response.data?.data;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn as any,
    },
  },
});

/**
 * Centralized Provider hierarchy.
 */
const Providers: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <SegmentProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LaunchDarklyProvider>
            <HelmetProvider>
              <BrowserRouter basename={CONTEXT_PATH}>{children}</BrowserRouter>
            </HelmetProvider>
          </LaunchDarklyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SegmentProvider>
  );
};

export default Sentry.withProfiler(Providers);
