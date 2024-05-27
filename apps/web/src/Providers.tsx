import { Loader } from '@mantine/core';
import { colors, ThemeProvider } from '@novu/design-system';
import { CONTEXT_PATH, SegmentProvider } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { api } from './api/api.client';
import { css } from '@novu/novui/css';

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
const Fallback = (
  <div
    className={css({
      h: '100dvh',
      w: '100dvw',
      display: 'grid',
      placeItems: 'center',
      bg: 'surface.page',
    })}
  >
    <Loader size={64} variant="bars" color={colors.gradientMiddle} />
  </div>
);

/**
 * Centralized Provider hierarchy.
 */
const Providers: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <ThemeProvider>
      <SegmentProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={CONTEXT_PATH}>
            <HelmetProvider>{children}</HelmetProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </SegmentProvider>
    </ThemeProvider>
  );
};

export default Sentry.withProfiler(Providers);
