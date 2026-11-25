import { Outlet } from 'react-router-dom';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { CopilotPageMount, useActiveCopilotPage } from '@/components/copilot-web-chat';
import { HelpPanelProvider } from '@/components/help-panel';
import { Toaster } from '@/components/primitives/sonner';
import { useAuth } from '@/context/auth/hooks';
import { LocalModeProvider } from '@/context/local-mode';
import { OptInProvider } from '@/context/opt-in-provider';
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

// The page Copilot's launcher sits at bottom-4 and is 38px tall, so toasts stack 8px above it. Sonner applies one
// offset to every edge of the screen.
const ABOVE_COPILOT_LAUNCHER_OFFSET = 62;

function DashboardToaster() {
  const copilotPage = useActiveCopilotPage();

  return <Toaster offset={copilotPage ? ABOVE_COPILOT_LAUNCHER_OFFSET : undefined} />;
}

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <DashboardProvisioningDismiss />
      <OptInProvider>
        <LocalModeProvider>
          <HelpPanelProvider>
            <CommandPaletteProvider>
              <Outlet />
              {/* Beside the page, not around it: it mounts and unmounts with the route without remounting the page. */}
              <CopilotPageMount />
              <CommandPalette />
              <DashboardToaster />
            </CommandPaletteProvider>
          </HelpPanelProvider>
        </LocalModeProvider>
      </OptInProvider>
    </ProtectedRoute>
  );
};
