import { RiAlertFill, RiTranslate2 } from 'react-icons/ri';
import { StatusBadge, StatusBadgeIcon, Dot } from '@/components/primitives/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchTranslationGroup } from '@/hooks/use-fetch-translation-group';
import { useIsTranslationEnabled } from '@/hooks/use-is-translation-enabled';
import { useEnvironment } from '@/context/environment/hooks';
import { LocalizationResourceEnum } from '@/types/translations';
import { ROUTES, buildRoute } from '@/utils/routes';

type WorkflowTranslationStatusProps = {
  workflowId: string;
  className?: string;
};

export function WorkflowTranslationStatus({ workflowId, className }: WorkflowTranslationStatusProps) {
  const isTranslationsEnabled = useIsTranslationEnabled();
  const { currentEnvironment } = useEnvironment();

  const { data: translationGroup } = useFetchTranslationGroup({
    resourceId: workflowId,
    resourceType: LocalizationResourceEnum.WORKFLOW,
    enabled: isTranslationsEnabled,
  });

  if (!isTranslationsEnabled || !translationGroup) {
    return null;
  }

  const hasOutdatedLocales = translationGroup.outdatedLocales && translationGroup.outdatedLocales.length > 0;

  const statusBadge = (
    <StatusBadge variant="light" status={hasOutdatedLocales ? 'pending' : 'completed'} className={className}>
      {hasOutdatedLocales ? (
        <>
          <RiAlertFill className="size-3.5" />
          <RiTranslate2 className="size-3.5" />
        </>
      ) : (
        <>
          <Dot />
          <RiTranslate2 className="size-3.5" />
        </>
      )}
      {hasOutdatedLocales ? 'Locales out of sync' : 'All locales in sync'}
    </StatusBadge>
  );

  if (hasOutdatedLocales) {
    const translationsUrl = currentEnvironment?.slug
      ? buildRoute(ROUTES.TRANSLATIONS, { environmentSlug: currentEnvironment.slug }) + `?workflowId=${workflowId}`
      : '#';

    return (
      <Tooltip>
        <TooltipTrigger asChild>{statusBadge}</TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">Locales out of sync</p>
            <p className="mt-1 text-xs text-neutral-400">
              Translation keys were added or removed from the default locale. Update other locales to stay up to date.
            </p>
            <a href={translationsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block underline">
              Manage translations ↗
            </a>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return statusBadge;
}
