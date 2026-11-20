import { IProviderConfig } from '@novu/shared';
import { ReactNode } from 'react';
import { NonModalSheet } from '@/components/primitives/sheet';
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
    <NonModalSheet open={isOpened} onOpenChange={handleOpenChange} className="w-auto min-w-[460px] flex-col">
      <IntegrationSheetHeader provider={provider} mode={mode} step={step} onBack={onBack} />
      {children}
    </NonModalSheet>
  );
}
