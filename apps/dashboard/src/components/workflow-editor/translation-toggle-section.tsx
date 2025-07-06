import { FormField } from '@/components/primitives/form/form';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslationSwitch } from '@/components/translations/translation-switch';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { ROUTES } from '@/utils/routes';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { InfoIcon } from 'lucide-react';
import { Control, FieldValues, Path } from 'react-hook-form';

interface TranslationToggleSectionProps<T extends FieldValues> {
  control: Control<T>;
  fieldName: Path<T>;
  onChange?: (checked: boolean) => void;
  isReadOnly?: boolean;
  workflowId?: string;
}

export function TranslationToggleSection<T extends FieldValues>({
  control,
  fieldName,
  onChange,
  isReadOnly = false,
  workflowId,
}: TranslationToggleSectionProps<T>) {
  const isTranslationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED);

  if (!isTranslationEnabled) {
    return null;
  }

  return (
    <div className="flex flex-col border-t border-neutral-100 pt-4">
      <FormField
        control={control}
        name={fieldName}
        render={({ field }) => (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <span className="text-label-xs text-text-strong">Enable Translations</span>
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
      <a
        href={`${ROUTES.TRANSLATIONS}?workflowId=${workflowId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground-400 text-2xs mb-1"
      >
        View & manage translations ↗
      </a>
    </div>
  );
}
