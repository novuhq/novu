import { useState } from 'react';
import { RiArrowRightSLine, RiInformation2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslationDrawer } from '@/components/translations/translation-drawer/translation-drawer';
import { TranslationSwitch } from '@/components/translations/translation-switch';
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
    const handleOnboardingClick = () => {
      navigate(translationsUrl);
    };

    const stopRowNavigation = (e: React.SyntheticEvent) => {
      e.stopPropagation();
    };

    return (
      <button
        type="button"
        onClick={handleOnboardingClick}
        className={cn(
          'group flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-none bg-transparent text-left transition-colors hover:bg-bg-weak focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-stroke-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className
        )}
      >
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-label-xs text-text-strong">Enable Translations</span>

            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex cursor-help"
                  onClick={stopRowNavigation}
                  onPointerDown={stopRowNavigation}
                  onKeyDown={stopRowNavigation}
                >
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

          <span className="text-text-sub group-hover:text-text-strong inline-flex shrink-0 items-center text-xs font-medium transition-color duration-200 ease-out  group-hover:translate-x-0.5">
            Setup
          </span>
          <RiArrowRightSLine
            aria-hidden
            className="arrow-right-hover-animation size-4 shrink-0 transition-transform duration-200 ease-out text-text-sub hover:text-text-strong group-hover:translate-x-0.5"
          />
        </div>
        <span className="text-foreground-400 text-xs">Set up your target locales first to enable translations</span>
      </button>
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
            className="text-foreground-400 text-xs hover:text-foreground-600 cursor-pointer text-left transition-colors"
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
