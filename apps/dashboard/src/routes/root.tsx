import { ClerkLoaded } from '@clerk/clerk-react';
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
import { SnitcherProvider } from '@/context/snitcher';
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
          {/*
           * Hold rendering until Clerk's bootstrap completes. On cross-origin satellite cold
           * loads the SDK has to bounce to the primary host for a handshake before it can
           * commit a final auth state — without this gate we'd briefly mount the dashboard
           * shell (or the auth layout) and then unmount it when the redirect fires, producing
           * a visible flash. The gate is brief: cookie-only handshake in production (`*.novu.co`
           * shares a parent domain) and a single redirect roundtrip in dev.
           */}
          <ClerkLoaded>
            <SegmentProvider>
              <CustomerIoProvider>
                <SnitcherProvider>
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
                </SnitcherProvider>
              </CustomerIoProvider>
            </SegmentProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export const RootRoute = withProfiler(RootRouteInternal);
