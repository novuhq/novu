import { getProviderSquareIconFileName } from '@/utils/provider-square-icon';
import { cn } from '../../../utils/ui';

interface ProviderIconProps {
  providerId: string;
  providerDisplayName: string;
  className?: string;
  /** Overrides the icon filename derived from `providerId` (e.g. agent-scoped channel icons). */
  iconFileName?: string;
}

export function ProviderIcon({ providerId, providerDisplayName, className, iconFileName }: ProviderIconProps) {
  return (
    <img
      src={`/images/providers/light/square/${iconFileName ?? getProviderSquareIconFileName(providerId)}.svg`}
      alt={providerDisplayName}
      className={cn('h-6 w-6 object-contain', className)}
    />
  );
}
