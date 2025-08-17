import { RiAlertFill, RiCheckboxCircleFill } from 'react-icons/ri';
import { StatusBadge, StatusBadgeIcon } from '@/components/primitives/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';

type TranslationStatusProps = {
  outdatedLocales?: string[];
  className?: string;
};

export function TranslationStatus({ outdatedLocales, className }: TranslationStatusProps) {
  const isOutdated = !!outdatedLocales?.length;

  const statusBadge = (
    <StatusBadge variant="light" status={isOutdated ? 'pending' : 'completed'} className={className}>
      <StatusBadgeIcon as={isOutdated ? RiAlertFill : RiCheckboxCircleFill} />
      {isOutdated ? 'Outdated, needs update' : 'Up-to-date'}
    </StatusBadge>
  );

  if (isOutdated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{statusBadge}</TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">Translation requires update</p>
            <p className="mt-1 text-xs text-neutral-400">
              Some target languages have missing or extra translation keys compared to the default language. Review and
              update translations to ensure all keys are consistent.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return statusBadge;
}
