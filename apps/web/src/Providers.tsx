import { ThemeProvider } from '@novu/design-system';
import { HelmetProvider } from 'react-helmet-async';
import { withProfiler } from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { NovuiProvider } from '@novu/novui';
import { api } from './api/api.client';
import { AuthProvider } from './components/providers/AuthProvider';
import { ClerkProvider } from './ee/clerk/providers/ClerkProvider';
import { EnvironmentProvider } from './components/providers/EnvironmentProvider';
import { SegmentProvider } from './components/providers/SegmentProvider';
import { StudioStateProvider } from './studio/StudioStateProvider';
import { ContainerProvider } from './hooks/useContainer';

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
                <EnvironmentProvider>
                  <HelmetProvider>
                    <StudioStateProvider>
                      <ContainerProvider>{children}</ContainerProvider>
                    </StudioStateProvider>
                  </HelmetProvider>
                </EnvironmentProvider>
              </AuthProvider>
            </QueryClientProvider>
          </SegmentProvider>
        </ClerkProvider>
      </NovuiProvider>
    </ThemeProvider>
  );
};

export default withProfiler(Providers);
