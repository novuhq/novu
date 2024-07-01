import { ThemeProvider } from '@novu/design-system';
import { SegmentProvider } from './components/providers/SegmentProvider';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { api } from './api/api.client';
import { NovuiProvider } from '@novu/novui';
import { AuthEnterpriseProvider } from './ee/clerk';
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
    <ThemeProvider>
      <NovuiProvider>
        <ClerkProvider>
          <SegmentProvider>
            <QueryClientProvider client={queryClient}>
              <AuthEnterpriseProvider>
                <HelmetProvider>{children}</HelmetProvider>
              </AuthEnterpriseProvider>
            </QueryClientProvider>
          </SegmentProvider>
        </ClerkProvider>
      </NovuiProvider>
    </ThemeProvider>
  );
};

export default Sentry.withProfiler(Providers);
