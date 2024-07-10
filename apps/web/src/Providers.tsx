import { ThemeProvider } from '@novu/design-system';
import { SegmentProvider } from './components/providers/SegmentProvider';
import { StudioStateProvider } from './studio/StudioStateProvider';
import { withProfiler } from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { api } from './api/api.client';
import { NovuiProvider } from '@novu/novui';
import { AuthContextProvider } from './auth/AuthContextProvider';

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
            <AuthContextProvider>
              <HelmetProvider>
                <StudioStateProvider>{children}</StudioStateProvider>
              </HelmetProvider>
            </AuthContextProvider>
          </QueryClientProvider>
        </SegmentProvider>
      </NovuiProvider>
    </ThemeProvider>
  );
};

export default withProfiler(Providers);
