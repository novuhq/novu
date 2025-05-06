import { cn } from '../../../utils/ui';

interface ProviderIconProps {
  providerId: string;
  providerDisplayName: string;
  className?: string;
}

export function ProviderIcon({ providerId, providerDisplayName, className }: ProviderIconProps) {
  return (
    <img
      src={`/images/providers/light/square/${providerId}.svg`}
      alt={providerDisplayName}
      className={cn('h-6 w-6', className)}
    />
  );
}
