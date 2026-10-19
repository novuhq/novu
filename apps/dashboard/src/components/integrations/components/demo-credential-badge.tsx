import { Badge } from '@/components/primitives/badge';
import { cn } from '@/utils/ui';
import { ProviderIcon } from './provider-icon';

type DemoCredentialBadgeProps = {
  className?: string;
};

export function DemoCredentialBadge({ className }: DemoCredentialBadgeProps) {
  return (
    <span
      className={cn(
        'bg-bg-weak border-stroke-weak inline-flex shrink-0 items-center gap-0.5 rounded-sm border py-0.5 pl-0.5 pr-1.5',
        className
      )}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center" aria-hidden>
        <span className="bg-success-base size-2 rounded-full shadow-xs" />
      </span>
      <span className="text-text-sub text-label-xs font-medium leading-4 whitespace-nowrap">Demo credential</span>
    </span>
  );
}

type DemoCredentialDropdownItemProps = {
  providerId: string;
  providerDisplayName: string;
  quotaLabel?: string;
  isSelected?: boolean;
  className?: string;
};

export function DemoCredentialDropdownItem({
  providerId,
  providerDisplayName,
  quotaLabel = '10 conversations/month',
  isSelected = false,
  className,
}: DemoCredentialDropdownItemProps) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-sm p-1.5',
        isSelected ? 'bg-bg-muted' : 'bg-bg-weak',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <ProviderIcon providerId={providerId} providerDisplayName={providerDisplayName} className="size-4 shrink-0" />
        <p className="text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
          <span className="text-text-sub">Demo credential</span>
          <span className="text-text-soft">{` · ${quotaLabel}`}</span>
        </p>
        <Badge color="yellow" variant="lighter" size="sm" className="shrink-0 rounded-sm uppercase">
          DEMO
        </Badge>
      </div>
    </div>
  );
}
