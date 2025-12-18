import { ThemeProvider } from '@novu/design-system';
import { NovuiProvider } from '@novu/novui';
import { withProfiler } from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { api } from './api/api.client';
import { AuthProvider } from './components/providers/AuthProvider';
import { EnvironmentProvider } from './components/providers/EnvironmentProvider';
import { SegmentProvider } from './components/providers/SegmentProvider';
import { RegionProvider } from './context/RegionProvider';
import { ClerkProvider } from './ee/clerk/providers/ClerkProvider';
import { StudioStateProvider } from './studio/StudioStateProvider';

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

const Providers: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <ThemeProvider shouldDisableGlobals>
      <NovuiProvider>
        <ClerkProvider>
          <QueryClientProvider client={queryClient}>
            <RegionProvider>
              <SegmentProvider>
                <AuthProvider>
                  <EnvironmentProvider>
                    <HelmetProvider>
                      <StudioStateProvider>{children}</StudioStateProvider>
                    </HelmetProvider>
                  </EnvironmentProvider>
                </AuthProvider>
              </SegmentProvider>
            </RegionProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </NovuiProvider>
    </ThemeProvider>
  );
};

export default withProfiler(Providers);
