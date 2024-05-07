import { Loader } from '@mantine/core';
import { CONTEXT_PATH, LaunchDarklyProvider, SegmentProvider } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { api } from './api/api.client';
import { AuthProvider } from './components/providers/AuthProvider';
import { css } from './styled-system/css';

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

/** Full-page loader that uses color-preferences for background */
const fallbackDisplay = (
  <div
    className={css({
      h: '100dvh',
      w: '100dvw',
      display: 'grid',
      placeItems: 'center',
      bg: 'surface.page',
      // Root element may not have loaded so rely on OS
      _osDark: { bg: 'legacy.BGDark' },
      _osLight: { bg: 'legacy.BGLight' },
    })}
  >
    <Loader size={64} />
  </div>
);

/**
 * Centralized Provider hierarchy.
 */
const Providers: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <SegmentProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LaunchDarklyProvider fallbackDisplay={fallbackDisplay}>
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
