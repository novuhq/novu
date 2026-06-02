import { Outlet } from 'react-router-dom';
import { AiDrawerProvider } from '@/components/ai-drawer';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { Toaster } from '@/components/primitives/sonner';
import { useAuth } from '@/context/auth/hooks';
import { OptInProvider } from '@/context/opt-in-provider';
import { useOnboardingProvisioningDismiss } from '@/hooks/use-onboarding-provisioning';
import { HostnameGuard } from './hostname-guard';
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
      <DashboardProvisioningDismiss />
      <OptInProvider>
        <AiDrawerProvider>
          <CommandPaletteProvider>
            <HostnameGuard>
              <Outlet />
            </HostnameGuard>
            <CommandPalette />
            <Toaster />
          </CommandPaletteProvider>
        </AiDrawerProvider>
      </OptInProvider>
    </ProtectedRoute>
  );
};
