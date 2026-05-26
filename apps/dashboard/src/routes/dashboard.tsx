import { Outlet } from 'react-router-dom';
import { AiDrawerProvider } from '@/components/ai-drawer';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { Toaster } from '@/components/primitives/sonner';
import { OptInProvider } from '@/context/opt-in-provider';
import { HostnameGuard } from './hostname-guard';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
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
