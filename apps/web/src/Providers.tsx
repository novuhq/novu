import { Loader } from '@mantine/core';
import { CONTEXT_PATH, LAUNCH_DARKLY_CLIENT_SIDE_ID, SegmentProvider } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { asyncWithLDProvider } from 'launchdarkly-react-client-sdk';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
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

type GenericProvider = ({ children }: { children: React.ReactNode }) => JSX.Element;

/**
 * Centralized Provider hierarchy.
 */
const Providers: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const LDProvider = useRef<GenericProvider>((props) => <>{props.children}</>);
  const [isLDReady, setIsLDReady] = useState<boolean>(false);

  useEffect(() => {
    const fetchLDProvider = async () => {
      LDProvider.current = await asyncWithLDProvider({
        clientSideID: LAUNCH_DARKLY_CLIENT_SIDE_ID,
        reactOptions: {
          useCamelCaseFlagKeys: false,
        },
        deferInitialization: true,
      });
      setIsLDReady(true);
    };
    fetchLDProvider();
  });

  if (!isLDReady) {
    return <Loader size={32} />;
  }

  return (
    <LDProvider.current>
      <SegmentProvider>
        <HelmetProvider>
          <BrowserRouter basename={CONTEXT_PATH}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>{children}</AuthProvider>
            </QueryClientProvider>
          </BrowserRouter>
        </HelmetProvider>
      </SegmentProvider>
    </LDProvider.current>
  );
};

export default Sentry.withProfiler(Providers);
