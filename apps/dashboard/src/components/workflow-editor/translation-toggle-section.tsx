import { motion } from 'motion/react';
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
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';

interface TranslationToggleSectionProps {
  value: boolean;
  onChange: (checked: boolean) => void;
  isReadOnly?: boolean;
  showManageLink?: boolean;
  showDrawer?: boolean;
  resourceId?: string;
  resourceType?: LocalizationResourceEnum;
}

export function TranslationToggleSection({
  value,
  onChange,
  isReadOnly = false,
  showManageLink = true,
  showDrawer = true,
  resourceId,
  resourceType,
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
      <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-label-xs text-text-strong">
              Enable Translations{' '}
              <Badge color="gray" size="sm" variant="lighter">
                BETA
              </Badge>
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <RiInformation2Line className="size-4 text-text-soft cursor-help" />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="left" hideWhenDetached>
                  When enabled, allows you to create and manage translations for your workflow content across different
                  languages.
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </div>
          <p className="text-foreground-400 text-2xs mb-1">Set up your target locales first to enable translations</p>
        </div>

        <motion.div whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Button
            variant="secondary"
            mode="ghost"
            size="xs"
            onClick={() => navigate(translationsUrl)}
            trailingIcon={RiArrowRightSLine}
          >
            Setup
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-neutral-100 pt-4">
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <span className="text-label-xs text-text-strong">
            Enable Translations{' '}
            <Badge color="gray" size="sm" variant="lighter">
              BETA
            </Badge>
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <RiInformation2Line className="size-4 text-text-soft cursor-help" />
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
            className="text-foreground-400 text-2xs hover:text-foreground-600 mb-1 cursor-pointer text-left transition-colors"
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
