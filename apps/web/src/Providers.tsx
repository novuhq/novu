import { ThemeProvider } from '@novu/design-system';
import { SegmentProvider } from './components/providers/SegmentProvider';
import { StudioStateProvider } from './studio/StudioStateProvider';
import { withProfiler } from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { api } from './api/api.client';
import { NovuiProvider } from '@novu/novui';
import { AuthProvider } from './components/providers/AuthProvider';
import { ClerkProvider } from './ee/clerk/providers/ClerkProvider';

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
    <ThemeProvider shouldDisableGlobals>
      <NovuiProvider>
        <ClerkProvider>
          <SegmentProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <HelmetProvider>
                  <StudioStateProvider>{children}</StudioStateProvider>
                </HelmetProvider>
              </AuthProvider>
            </QueryClientProvider>
          </SegmentProvider>
        </ClerkProvider>
      </NovuiProvider>
    </ThemeProvider>
  );
};

export default withProfiler(Providers);
