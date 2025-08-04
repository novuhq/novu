import { DEFAULT_LOCALE, EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { HTMLAttributes, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  RiCheckLine,
  RiCloseLine,
  RiDownload2Line,
  RiLoader4Line,
  RiSettingsLine,
  RiUpload2Line,
} from 'react-icons/ri';
import { useNavigate, useParams } from 'react-router-dom';
import { TranslationsFilter } from '@/api/translations';
import { FlagCircle } from '@/components/flag-circle';
import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useExportMasterJson } from '@/hooks/use-export-master-json';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useUploadMasterJson } from '@/hooks/use-upload-master-json';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { defaultTranslationsFilter } from './hooks/use-translations-url-state';

type SearchFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

function SearchFilter({ value, onChange }: SearchFilterProps) {
  return (
    <FacetedFormFilter
      type="text"
      size="small"
      title="Search"
      value={value}
      onChange={onChange}
      placeholder="Search translations..."
    />
  );
}

type FilterResetButtonProps = {
  isVisible: boolean;
  isFetching?: boolean;
  onReset: () => void;
};

function FilterResetButton({ isVisible, isFetching, onReset }: FilterResetButtonProps) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-1">
      <Button variant="secondary" mode="ghost" size="2xs" onClick={onReset}>
        Reset
      </Button>
      {isFetching && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
    </div>
  );
}

type DefaultLocaleButtonProps = {
  locale: string;
  onClick: () => void;
};

function DefaultLocaleButton({ locale, onClick }: DefaultLocaleButtonProps) {
  return (
    <button
      type="button"
      className="group flex h-8 items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-xs hover:bg-neutral-50 focus:bg-neutral-100"
      onClick={onClick}
    >
      <span className="px-3 py-2">Default language</span>
      <span className="flex items-center gap-2 border-l border-neutral-200 bg-white p-2 font-medium text-neutral-700 group-hover:bg-neutral-50">
        <FlagCircle locale={locale} size="sm" />
        {locale}
      </span>
    </button>
  );
}

function AnimatedImportButton({
  isPending,
  isSuccess,
  isError,
  disabled,
  onClick,
}: {
  isPending?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isSuccess || isError) {
      setShowResult(true);
      const timer = setTimeout(() => setShowResult(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, isError]);

  return (
    <Button
      variant="secondary"
      mode="lighter"
      className="relative min-w-[80px] gap-2"
      onClick={onClick}
      disabled={disabled || isPending}
    >
      <div className="relative">
        {/* Default content - normal layout */}
        <motion.div
          initial={false}
          animate={{
            opacity: showResult ? 0 : 1,
          }}
          transition={{
            duration: 0.15,
            ease: 'easeOut',
          }}
          className="flex items-center gap-2"
        >
          {isPending ? (
            <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RiUpload2Line className="h-3.5 w-3.5" />
          )}
          Import
        </motion.div>

        {/* Success/Error overlay */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1], // Custom smooth easing
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {isSuccess ? (
                <div className="flex items-center gap-1">
                  <RiCheckLine className="size-4 text-green-600" />
                  <span className="text-xs text-green-600">Success!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <RiCloseLine className="size-4 text-red-600" />
                  <span className="text-xs text-red-600">Failed</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Button>
  );
}

function ActionButtons() {
  const navigate = useNavigate();
  const { environmentSlug } = useParams();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const has = useHasPermission();
  const { currentEnvironment } = useEnvironment();
  const canWrite = has({ permission: PermissionsEnum.WORKFLOW_WRITE });
  const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;
  const canEdit = canWrite && isDevEnvironment;

  const defaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

  const exportMutation = useExportMasterJson();
  const uploadMutation = useUploadMasterJson();

  const handleConfigure = () => {
    if (environmentSlug) {
      navigate(buildRoute(ROUTES.TRANSLATION_SETTINGS, { environmentSlug }));
    }
  };

  const handleExport = () => {
    exportMutation.mutate({ locale: defaultLocale });
  };

  const handleImport = () => {
    uploadMutation.triggerFileUpload();
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            mode="lighter"
            className="gap-2"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RiDownload2Line className="h-3.5 w-3.5" />
            )}
            Export
          </Button>
        </TooltipTrigger>
        {/* <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">Export Master JSON</p>
            <p className="mt-1 text-xs text-neutral-400">
              Download a JSON file containing all translation resources for {defaultLocale} (default langauge). Send
              this to translation services or translators, then import the translated version back.
            </p>
          </div>
        </TooltipContent> */}
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <AnimatedImportButton
            isPending={uploadMutation.isPending}
            isSuccess={uploadMutation.isSuccess}
            isError={uploadMutation.isError}
            disabled={!canEdit}
            onClick={handleImport}
          />
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">Import Master JSON</p>
            <p className="mt-1 text-xs text-neutral-400">
              {!canEdit
                ? 'Edit translations in your development environment.'
                : 'Upload a translated JSON file to import or update translations. Locale is automatically detected from filename (e.g., en_US.json, fr_FR.json). The system will match resources by ID and create new ones or update existing translations.'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>

      <DefaultLocaleButton locale={defaultLocale} onClick={handleConfigure} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            mode="lighter"
            onClick={handleConfigure}
            leadingIcon={RiSettingsLine}
            disabled={!canEdit}
          >
            Configure translations
          </Button>
        </TooltipTrigger>
        {!canEdit && <TooltipContent>Edit translations in your development environment.</TooltipContent>}
      </Tooltip>
    </div>
  );
}

function useTranslationsFiltersLogic(
  filterValues: TranslationsFilter,
  onFiltersChange: (filter: TranslationsFilter) => void,
  onReset?: () => void
) {
  const form = useForm<TranslationsFilter>({
    values: filterValues,
    defaultValues: filterValues,
  });

  const { formState, watch } = form;

  useEffect(() => {
    const subscription = watch((value: TranslationsFilter) => {
      onFiltersChange(value);
    });

    return () => subscription.unsubscribe();
  }, [watch, onFiltersChange]);

  const handleReset = () => {
    form.reset(defaultTranslationsFilter);
    onFiltersChange(defaultTranslationsFilter);
    onReset?.();
  };

  const isResetButtonVisible = formState.isDirty || filterValues.query !== '';

  return {
    form,
    handleReset,
    isResetButtonVisible,
  };
}

export type TranslationsFiltersProps = HTMLAttributes<HTMLFormElement> & {
  onFiltersChange: (filter: TranslationsFilter) => void;
  filterValues: TranslationsFilter;
  onReset?: () => void;
  isFetching?: boolean;
};

export function TranslationsFilters({
  onFiltersChange,
  filterValues,
  onReset,
  className,
  isFetching,
  ...props
}: TranslationsFiltersProps) {
  const { form, handleReset, isResetButtonVisible } = useTranslationsFiltersLogic(
    filterValues,
    onFiltersChange,
    onReset
  );

  return (
    <Form {...form}>
      <FormRoot className={cn('flex w-full items-center justify-between gap-2', className)} {...props}>
        <div className="flex flex-1 items-center gap-2">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem className="relative">
                <SearchFilter value={field.value || ''} onChange={field.onChange} />
              </FormItem>
            )}
          />

          <FilterResetButton isVisible={isResetButtonVisible} isFetching={isFetching} onReset={handleReset} />
        </div>

        <ActionButtons />
      </FormRoot>
    </Form>
  );
}
