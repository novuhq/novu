import { IProviderConfig } from '@novu/shared';
import { RiArrowLeftSLine } from 'react-icons/ri';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/primitives/sheet';
import { useEnvironment } from '@/context/environment/hooks';
import { CompactButton } from '../../primitives/button-compact';
import { ProviderDeprecatedBadge } from './provider-deprecation';
import { ProviderIcon } from './provider-icon';

type IntegrationSheetHeaderProps = {
  provider?: IProviderConfig;
  mode: 'create' | 'update';
  onBack?: () => void;
  step?: 'select' | 'configure';
};

export function IntegrationSheetHeader({ provider, mode, onBack, step }: IntegrationSheetHeaderProps) {
  const { currentEnvironment } = useEnvironment();

  if (mode === 'create' && step === 'select') {
    return (
      <SheetHeader className="border-stroke-soft space-y-0.5 border-b py-3 pl-5 pr-12">
        <SheetTitle className="text-label-md text-text-strong">Add a provider</SheetTitle>
        <SheetDescription className="text-paragraph-xs text-text-sub">
          {currentEnvironment?.name
            ? `Connects to ${currentEnvironment.name}. You can add it to other environments after.`
            : 'You can add it to other environments after.'}
        </SheetDescription>
      </SheetHeader>
    );
  }

  if (!provider) return null;

  return (
    <SheetHeader className="borde-neutral-300 space-y-1 border-b p-3">
      <SheetTitle>
        <div className="flex items-center gap-2">
          {mode === 'create' && onBack && (
            <CompactButton
              icon={RiArrowLeftSLine}
              variant="ghost"
              size="md"
              className="text-foreground-950 h-5 p-0.5 leading-none"
              onClick={onBack}
            ></CompactButton>
          )}
          <div>
            <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} />
          </div>
          <div className="text-md text-foreground-950 leading-6">{provider.displayName}</div>
          <ProviderDeprecatedBadge provider={provider} />
        </div>
      </SheetTitle>
    </SheetHeader>
  );
}
