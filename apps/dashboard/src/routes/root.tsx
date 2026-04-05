import { ErrorBoundary, withProfiler } from '@sentry/react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';
import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { AuthProvider } from '@/context/auth/auth-provider';
import { CustomerIoProvider } from '@/context/customer-io';
import { EEAuthProvider as ClerkProvider } from '@/context/ee-auth-provider';
import { EscapeKeyManagerProvider } from '@/context/escape-key-manager/escape-key-manager';
import { IdentityProvider } from '@/context/identity-provider';
import { RegionProvider } from '@/context/region';
import { SegmentProvider } from '@/context/segment';
import { RootRouteErrorFallback } from '@/routes/root-route-error-fallback';

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
    <ErrorBoundary fallback={({ error, eventId }) => <RootRouteErrorFallback error={error} eventId={eventId} />}>
      <QueryClientProvider client={queryClient}>
        <ClerkProvider>
          <SegmentProvider>
            <CustomerIoProvider>
              <AuthProvider>
                <RegionProvider>
                  <IdentityProvider>
                    <HelmetProvider>
                      <TooltipProvider delayDuration={100}>
                        <EscapeKeyManagerProvider>
                          <Outlet />
                        </EscapeKeyManagerProvider>
                      </TooltipProvider>
                    </HelmetProvider>
                  </IdentityProvider>
                </RegionProvider>
              </AuthProvider>
            </CustomerIoProvider>
          </SegmentProvider>
        </ClerkProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export const RootRoute = withProfiler(RootRouteInternal);
