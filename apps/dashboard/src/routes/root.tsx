import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { IS_SELF_HOSTED } from '@/config';
import { AuthProvider } from '@/context/auth/auth-provider';
import { ClerkProvider } from '@/context/clerk-provider';
import { EscapeKeyManagerProvider } from '@/context/escape-key-manager/escape-key-manager';
import { IdentityProvider } from '@/context/identity-provider';
import { SegmentProvider } from '@/context/segment';
import { ErrorBoundary, withProfiler } from '@sentry/react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showError !== false) {
        showToast({
          children: () => (
            <>
              <ToastIcon variant="error" />
              <span className="text-sm">
                {(query.meta?.errorMessage as string | undefined) || error.message || 'Issue fetching.'}
              </span>
            </>
          ),
          options: {
            position: 'bottom-right',
            classNames: {
              toast: 'mb-4 right-0',
            },
          },
        });
      }
    },
  }),
});

const RootRouteInternal = () => {
  return (
    <ErrorBoundary
      fallback={({ error, eventId }) => (
        <>
          We apologize, but something unexpected happened. <br />
          {IS_SELF_HOSTED
            ? 'Please check your application logs or try refreshing the page. If the issue persists, consider restarting your Novu services.'
            : 'Please try refreshing the page. If the problem continues, you can contact our support team with the event ID below for assistance.'}
          <br />
          <code>
            <small style={{ color: 'lightGrey' }}>
              Event ID: {eventId}
              <br />
              {(error as object).toString()}
            </small>
          </code>
        </>
      )}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkProvider>
          <SegmentProvider>
            <AuthProvider>
              <IdentityProvider>
                <HelmetProvider>
                  <TooltipProvider delayDuration={100}>
                    <EscapeKeyManagerProvider>
                      <Outlet />
                    </EscapeKeyManagerProvider>
                  </TooltipProvider>
                </HelmetProvider>
              </IdentityProvider>
            </AuthProvider>
          </SegmentProvider>
        </ClerkProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export const RootRoute = withProfiler(RootRouteInternal);
