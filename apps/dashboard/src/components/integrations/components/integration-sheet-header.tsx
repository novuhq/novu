import { IProviderConfig } from '@novu/shared';
import { RiArrowLeftLine, RiArrowLeftSLine, RiShareBoxLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/primitives/sheet';
import { useEnvironment } from '@/context/environment/hooks';
import { CompactButton } from '../../primitives/button-compact';
import { ProviderDeprecatedBadge } from './provider-deprecation';
import { ProviderIcon } from './provider-icon';
import { CHANNEL_LABELS, usesProviderSetupLayout } from './utils/helpers';

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

  if (mode === 'create' && step === 'configure' && usesProviderSetupLayout(provider.id)) {
    return (
      <SheetHeader className="border-stroke-soft flex-row items-center gap-2 space-y-0 border-b py-3 pl-3 pr-12">
        {onBack && (
          <CompactButton
            icon={RiArrowLeftLine}
            variant="ghost"
            size="md"
            className="text-text-sub"
            onClick={onBack}
            aria-label="Back to providers"
          />
        )}
        <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]">
          <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-4" />
        </span>
        <SheetTitle className="text-label-md text-text-strong truncate">Connect {provider.displayName}</SheetTitle>
        <Badge variant="stroke" color="gray" size="sm" className="shrink-0">
          {CHANNEL_LABELS[provider.channel]}
        </Badge>
        {provider.docReference && (
          <a
            href={provider.docReference}
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-xs text-text-sub hover:text-text-strong ml-auto flex shrink-0 items-center gap-1"
          >
            Docs
            <RiShareBoxLine className="size-3.5" />
          </a>
        )}
      </SheetHeader>
    );
  }

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
