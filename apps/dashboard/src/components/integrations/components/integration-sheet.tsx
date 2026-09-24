import { IProviderConfig } from '@novu/shared';
import { ReactNode } from 'react';
import { NonModalSheetContent, Sheet } from '@/components/primitives/sheet';
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
    // Non-modal so the integration conditions editor nested below can use portaled dropdowns.
    <Sheet modal={false} open={isOpened} onOpenChange={handleOpenChange}>
      <NonModalSheetContent open={isOpened} onOverlayClick={onClose} className="w-auto min-w-[460px] flex-col">
        <IntegrationSheetHeader provider={provider} mode={mode} step={step} onBack={onBack} />
        {children}
      </NonModalSheetContent>
    </Sheet>
  );
}
