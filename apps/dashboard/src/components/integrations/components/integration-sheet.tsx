import { IProviderConfig } from '@novu/shared';
import { ReactNode } from 'react';
import { NonModalSheet } from '@/components/primitives/sheet';
import { cn } from '@/utils/ui';
import { IntegrationSheetHeader } from './integration-sheet-header';
import { usesProviderSetupLayout } from './utils/helpers';

type IntegrationSheetProps = {
  isOpened: boolean;
  onClose: () => void;
  provider?: IProviderConfig;
  mode: 'create' | 'update';
  step?: 'select' | 'configure';
  onBack?: () => void;
  /** Replaces the default header, e.g. for the manage drawer. */
  header?: ReactNode;
  /** The manage drawer: a settings pane and a details panel side by side. */
  isManageLayout?: boolean;
  children: ReactNode;
};

function getSheetWidth({ mode, step, provider, isManageLayout }: Partial<IntegrationSheetProps>) {
  if (isManageLayout) return 'w-[900px] max-w-full sm:max-w-[900px]';
  // The provider picker lays providers out two per row, and the setup layout is drawn at the same width.
  if (mode === 'create' && (step === 'select' || usesProviderSetupLayout(provider?.id))) {
    return 'w-[600px] max-w-full sm:max-w-[600px]';
  }

  return 'w-auto min-w-[460px]';
}

export function IntegrationSheet({
  isOpened,
  onClose,
  provider,
  mode,
  step,
  onBack,
  header,
  isManageLayout,
  children,
}: IntegrationSheetProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <NonModalSheet
      open={isOpened}
      onOpenChange={handleOpenChange}
      className={cn('flex-col', getSheetWidth({ mode, step, provider, isManageLayout }))}
    >
      {header ?? <IntegrationSheetHeader provider={provider} mode={mode} step={step} onBack={onBack} />}
      {children}
    </NonModalSheet>
  );
}
