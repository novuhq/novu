import { Outlet } from 'react-router-dom';
// @ts-ignore
import { IntercomProvider } from 'react-use-intercom';
import { AiDrawerProvider } from '@/components/ai-drawer';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { Toaster } from '@/components/primitives/sonner';
import { INTERCOM_APP_ID } from '@/config';
import { OptInProvider } from '@/context/opt-in-provider';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <OptInProvider>
          <AiDrawerProvider>
            <CommandPaletteProvider>
              <Outlet />
              <CommandPalette />
              <Toaster />
            </CommandPaletteProvider>
          </AiDrawerProvider>
        </OptInProvider>
      </IntercomProvider>
    </ProtectedRoute>
  );
};
