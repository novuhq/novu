import { useState } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslationDrawer } from '@/components/translations/translation-drawer/translation-drawer';
import { TranslationSwitch } from '@/components/translations/translation-switch';
import { SetupRow } from '@/components/workflow-editor/setup-row';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { LocalizationResourceEnum } from '@/types/translations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

interface TranslationToggleSectionProps {
  value: boolean;
  onChange: (checked: boolean) => void;
  isReadOnly?: boolean;
  showManageLink?: boolean;
  showDrawer?: boolean;
  resourceId?: string;
  resourceType?: LocalizationResourceEnum;
  className?: string;
}

export function TranslationToggleSection({
  value,
  onChange,
  isReadOnly = false,
  showManageLink = true,
  showDrawer = true,
  resourceId,
  resourceType,
  className,
}: TranslationToggleSectionProps) {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings, isLoading: isLoadingSettings } = useFetchOrganizationSettings();
  const translationsUrl = buildRoute(ROUTES.TRANSLATIONS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  const hasTargetLocales = (organizationSettings?.data?.targetLocales?.length ?? 0) > 0;
  const needsOnboarding = !isLoadingSettings && !hasTargetLocales;

  const handleManageTranslationsClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (showDrawer) {
      setIsDrawerOpen(true);
    } else {
      // Fallback to navigation if no resourceId is provided
      navigate(translationsUrl);
    }
  };

  if (needsOnboarding) {
    return (
      <SetupRow
        to={translationsUrl}
        title="Enable Translations"
        tooltipContent="When enabled, allows you to create and manage translations for your workflow content across different languages."
        description="Set up your target locales first to enable translations"
        className={cn(
          'w-full min-w-0 rounded-none px-3 py-4 transition-colors hover:bg-bg-weak focus-within:outline-hidden focus-within:ring-2 focus-within:ring-stroke-strong focus-within:ring-offset-2 focus-within:ring-offset-background',
          className
        )}
      />
    );
  }

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}>
      <div className="flex w-full min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-label-xs text-text-strong">Enable Translations</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help shrink-0">
                <RiInformation2Line className="size-4 text-text-soft" />
              </span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="left" hideWhenDetached>
                When enabled, allows you to create and manage translations for your workflow content across different
                languages.
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
        <TranslationSwitch
          id={`enable-translations-${resourceId}`}
          value={value}
          onChange={onChange}
          isReadOnly={isReadOnly}
        />
      </div>
      {showManageLink && (
        <>
          <button
            type="button"
            onClick={handleManageTranslationsClick}
            className="text-text-soft hover:text-text-sub text-xs cursor-pointer text-left transition-colors"
          >
            View & manage translations ↗
          </button>

          {showDrawer && (
            <TranslationDrawer
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              resourceType={resourceType ?? LocalizationResourceEnum.WORKFLOW}
              resourceId={resourceId ?? ''}
            />
          )}
        </>
      )}
    </div>
  );
}
