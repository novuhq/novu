import { IProviderConfig } from '@novu/shared';
import { ReactNode } from 'react';
import { NonModalSheet } from '@/components/primitives/sheet';
import { cn } from '@/utils/ui';
import { IntegrationSheetHeader } from './integration-sheet-header';

type IntegrationSheetProps = {
  isOpened: boolean;
  onClose: () => void;
  provider?: IProviderConfig;
  mode: 'create' | 'update';
  step?: 'select' | 'configure';
  onBack?: () => void;
  children: ReactNode;
};

export function IntegrationSheet({ isOpened, onClose, provider, mode, step, onBack, children }: IntegrationSheetProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <NonModalSheet
      open={isOpened}
      onOpenChange={handleOpenChange}
      className={cn(
        'flex-col',
        // The provider picker lays providers out two per row, so it needs the wider drawer.
        mode === 'create' && step === 'select' ? 'w-[600px] max-w-[600px] sm:max-w-[600px]' : 'w-auto min-w-[460px]'
      )}
    >
      <IntegrationSheetHeader provider={provider} mode={mode} step={step} onBack={onBack} />
      {children}
    </NonModalSheet>
  );
}
