import { HTMLAttributes, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiLoader4Line, RiSettingsLine, RiUploadLine, RiDownloadLine } from 'react-icons/ri';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { FlagCircle } from '@/components/flag-circle';
import { cn } from '@/utils/ui';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { DEFAULT_LOCALE, PermissionsEnum, EnvironmentTypeEnum } from '@novu/shared';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useEnvironment } from '@/context/environment/hooks';

import { defaultTranslationsFilter } from './hooks/use-translations-url-state';
import { useExportMasterJson } from '@/hooks/use-export-master-json';
import { useUploadMasterJson } from '@/hooks/use-upload-master-json';
import { TranslationsFilter } from '@/api/translations';

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
      <span className="px-3 py-2">Default locale</span>
      <span className="flex items-center gap-2 border-l border-neutral-200 bg-white p-2 font-medium text-neutral-700 group-hover:bg-neutral-50">
        <FlagCircle locale={locale} size="sm" />
        {locale}
      </span>
    </button>
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
            className="px-2.5 py-1.5"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <RiLoader4Line className="h-3 w-3 animate-spin" />
            ) : (
              <RiDownloadLine className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">Export Master JSON</p>
            <p className="mt-1 text-xs text-neutral-400">
              Download a JSON file containing all translation resources for {defaultLocale} (default locale). Send this
              to translation services or translators, then import the translated version back.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            mode="lighter"
            className="px-2.5 py-1.5"
            onClick={handleImport}
            disabled={uploadMutation.isPending || !canEdit}
          >
            {uploadMutation.isPending ? (
              <RiLoader4Line className="h-3 w-3 animate-spin" />
            ) : (
              <RiUploadLine className="h-3 w-3" />
            )}
          </Button>
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
