import { ThemeProvider } from '@novu/design-system';
import { SegmentProvider } from './components/providers/SegmentProvider';
import { StudioStateProvider } from './studio/StudioStateProvider';
import { CONTEXT_PATH } from './config';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { api } from './api/api.client';
import { NovuiProvider } from '@novu/novui';

const defaultQueryFn = async ({ queryKey }: { queryKey: string }) => {
  const response = await api.get(`${queryKey[0]}`);

  return response.data?.data;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn as any,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const Providers: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <ThemeProvider>
      <NovuiProvider>
        <SegmentProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={CONTEXT_PATH}>
              <HelmetProvider>
                <StudioStateProvider>{children}</StudioStateProvider>
              </HelmetProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </SegmentProvider>
      </NovuiProvider>
    </ThemeProvider>
  );
};

export default Sentry.withProfiler(Providers);
