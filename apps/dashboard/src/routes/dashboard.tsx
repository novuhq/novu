import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AiDrawerProvider } from '@/components/ai-drawer';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { Toaster } from '@/components/primitives/sonner';
import { RouteFallback } from '@/components/route-fallback';
import { useAuth } from '@/context/auth/hooks';
import { LocalModeProvider } from '@/context/local-mode';
import { OptInProvider } from '@/context/opt-in-provider';
import { PageHeaderProvider } from '@/context/page-header';
import { useOnboardingProvisioningDismiss } from '@/hooks/use-onboarding-provisioning';
import { ProtectedRoute } from './protected-route';

function DashboardProvisioningDismiss() {
  const { isOrganizationLoaded, currentOrganization } = useAuth();

  // Clear stale org-create provisioning when the user lands on any dashboard route
  // (e.g. /env/:slug/workflows) without going through an onboarding dismiss page.
  useOnboardingProvisioningDismiss({
    isReady: isOrganizationLoaded && Boolean(currentOrganization),
    fallbackVariant: 'platform',
  });

  return null;
}

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <PageHeaderProvider>
        <DashboardProvisioningDismiss />
        <OptInProvider>
          <LocalModeProvider>
            <AiDrawerProvider>
              <CommandPaletteProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Outlet />
                </Suspense>
                <CommandPalette />
                <Toaster />
              </CommandPaletteProvider>
            </AiDrawerProvider>
          </LocalModeProvider>
        </OptInProvider>
      </PageHeaderProvider>
    </ProtectedRoute>
  );
};
