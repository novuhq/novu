import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withLDProvider } from 'launchdarkly-react-client-sdk';
import { PropsWithChildren } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { api } from './api/api.client';
import { AuthProvider } from './components/providers/AuthProvider';

import { SegmentProvider, CONTEXT_PATH, applyToken, getToken, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '@novu/shared-web';
import { Integrations } from '@sentry/tracing';
import { library } from '@fortawesome/fontawesome-svg-core';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { ENV, SENTRY_DSN } from './config';

const initializeApp = () => {
  library.add(far, fas);

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        new Integrations.BrowserTracing(),
        new Sentry.Replay({
          // Additional SDK configuration goes in here, for example:
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      environment: ENV,

      /*
       * This sets the sample rate to be 10%. You may want this to be 100% while
       * in development and sample at a lower rate in production
       */
      replaysSessionSampleRate: 0.5,

      /*
       * If the entire session is not sampled, use the below sample rate to sample
       * sessions when an error occurs.
       */
      replaysOnErrorSampleRate: 1.0,

      /*
       * Set tracesSampleRate to 1.0 to capture 100%
       * of transactions for performance monitoring.
       * We recommend adjusting this value in production
       */
      tracesSampleRate: 1.0,
      beforeSend(event: Sentry.Event) {
        return event;
      },
    });
  }

  const tokenStoredToken: string = getToken();

  applyToken(tokenStoredToken);
};

initializeApp();

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
