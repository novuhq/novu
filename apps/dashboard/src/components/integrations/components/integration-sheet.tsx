import { ReactNode } from 'react';
import { Sheet, SheetContent } from '@/components/primitives/sheet';
import { IntegrationSheetHeader } from './integration-sheet-header';
import { IProviderConfig } from '@novu/shared';

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
  return (
    <Sheet open={isOpened} onOpenChange={onClose}>
      <SheetContent className={`w-auto min-w-[460px] flex-col`}>
        <IntegrationSheetHeader provider={provider} mode={mode} step={step} onBack={onBack} />
        {children}
      </SheetContent>
    </Sheet>
  );
}
