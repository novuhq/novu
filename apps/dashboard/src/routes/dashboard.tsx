import { Outlet } from 'react-router-dom';
import { AiDrawerProvider } from '@/components/ai-drawer';
import { CommandPalette } from '@/components/command-palette';
import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { Toaster } from '@/components/primitives/sonner';
import { OptInProvider } from '@/context/opt-in-provider';
import { ProtectedRoute } from './protected-route';

export const DashboardRoute = () => {
  return (
    <ProtectedRoute>
      <OptInProvider>
        <AiDrawerProvider>
          <CommandPaletteProvider>
            <Outlet />
            <CommandPalette />
            <Toaster />
          </CommandPaletteProvider>
        </AiDrawerProvider>
      </OptInProvider>
    </ProtectedRoute>
  );
};
