import { CONTEXT_PATH, LAUNCH_DARKLY_CLIENT_SIDE_ID, SegmentProvider } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withLDProvider } from 'launchdarkly-react-client-sdk';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { api } from './api/api.client';
import { AuthProvider } from './components/providers/AuthProvider';

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
      <HelmetProvider>
        <BrowserRouter basename={CONTEXT_PATH}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </HelmetProvider>
    </SegmentProvider>
  );
};

export default Sentry.withProfiler(
  withLDProvider({
    clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
    reactOptions: {
      useCamelCaseFlagKeys: false,
    },
  })(Providers)
);
