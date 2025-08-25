import { FeatureFlagsKeysEnum } from '@novu/shared';
import { InfoIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { RiArrowRightSLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { FormField } from '@/components/primitives/form/form';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslationDrawer } from '@/components/translations/translation-drawer/translation-drawer';
import { TranslationSwitch } from '@/components/translations/translation-switch';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { LocalizationResourceEnum } from '@/types/translations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';

interface TranslationToggleSectionProps<T extends FieldValues> {
  control: Control<T>;
  fieldName: Path<T>;
  onChange?: (checked: boolean) => void;
  isReadOnly?: boolean;
  showManageLink?: boolean;
  workflowId?: string;
}

export function TranslationToggleSection<T extends FieldValues>({
  control,
  fieldName,
  onChange,
  isReadOnly = false,
  showManageLink = true,
  workflowId,
}: TranslationToggleSectionProps<T>) {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isTranslationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED);
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings, isLoading: isLoadingSettings } = useFetchOrganizationSettings();

  if (!isTranslationEnabled) {
    return null;
  }

  const translationsUrl = buildRoute(ROUTES.TRANSLATIONS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  const hasTargetLocales = (organizationSettings?.data?.targetLocales?.length ?? 0) > 0;
  const needsOnboarding = !isLoadingSettings && !hasTargetLocales;

  const handleManageTranslationsClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (workflowId) {
      setIsDrawerOpen(true);
    } else {
      // Fallback to navigation if no workflowId is provided
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
                <InfoIcon className="text-text-soft h-4 w-4 cursor-help" />
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
      <FormField
        control={control}
        name={fieldName}
        render={({ field }) => (
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
                  <InfoIcon className="text-text-soft h-4 w-4 cursor-help" />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent side="left" hideWhenDetached>
                    When enabled, allows you to create and manage translations for your workflow content across
                    different languages.
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </div>
            <TranslationSwitch
              id={`enable-translations-${fieldName}`}
              value={field.value}
              onChange={(checked) => {
                field.onChange(checked);
                onChange?.(checked);
              }}
              isReadOnly={isReadOnly}
            />
          </div>
        )}
      />
      {showManageLink && (
        <>
          <button
            type="button"
            onClick={handleManageTranslationsClick}
            className="text-foreground-400 text-2xs hover:text-foreground-600 mb-1 cursor-pointer text-left transition-colors"
          >
            View & manage translations ↗
          </button>

          {workflowId && (
            <TranslationDrawer
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              resourceType={LocalizationResourceEnum.WORKFLOW}
              resourceId={workflowId}
            />
          )}
        </>
      )}
    </div>
  );
}
