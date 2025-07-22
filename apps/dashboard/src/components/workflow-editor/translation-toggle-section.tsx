import { FormField } from '@/components/primitives/form/form';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslationSwitch } from '@/components/translations/translation-switch';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { InfoIcon } from 'lucide-react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { Badge } from '../primitives/badge';
import { useEnvironment } from '@/context/environment/hooks';

interface TranslationToggleSectionProps<T extends FieldValues> {
  control: Control<T>;
  fieldName: Path<T>;
  onChange?: (checked: boolean) => void;
  isReadOnly?: boolean;
}

export function TranslationToggleSection<T extends FieldValues>({
  control,
  fieldName,
  onChange,
  isReadOnly = false,
}: TranslationToggleSectionProps<T>) {
  const isTranslationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED);
  const { currentEnvironment } = useEnvironment();

  if (!isTranslationEnabled) {
    return null;
  }

  const translationsUrl = buildRoute(ROUTES.TRANSLATIONS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

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
      <a href={translationsUrl} rel="noopener noreferrer" className="text-foreground-400 text-2xs mb-1">
        View & manage translations ↗
      </a>
    </div>
  );
}
