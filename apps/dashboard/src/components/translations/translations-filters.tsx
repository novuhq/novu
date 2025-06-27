import { HTMLAttributes, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiDownloadLine, RiLoader4Line, RiSettings4Line } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { FlagCircle } from '@/components/flag-circle';
import { cn } from '@/utils/ui';

import { defaultTranslationsFilter, TranslationsFilter } from './hooks/use-translations-url-state';

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
};

function DefaultLocaleButton({ locale }: DefaultLocaleButtonProps) {
  return (
    <button className="group flex h-8 items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-xs hover:bg-neutral-50 focus:bg-neutral-100">
      <span className="px-3 py-2">Default locale</span>
      <span className="flex items-center gap-2 border-l border-neutral-200 bg-white p-2 font-medium text-neutral-700 group-hover:bg-neutral-50">
        <FlagCircle locale={locale} size="sm" />
        {locale}
      </span>
    </button>
  );
}

type ActionButtonsProps = {
  onExport: () => void;
  onConfigure: () => void;
  defaultLocale?: string;
};

function ActionButtons({ onExport, onConfigure, defaultLocale = 'en_US' }: ActionButtonsProps) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <Button variant="secondary" mode="lighter" size="xs" className="!w-8" onClick={onExport}>
        <RiDownloadLine className="h-3 w-3" />
      </Button>

      <DefaultLocaleButton locale={defaultLocale} />

      <Button variant="secondary" mode="lighter" size="xs" onClick={onConfigure}>
        <RiSettings4Line className="mr-2 h-4 w-4" />
        Configure translations
      </Button>
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
    const subscription = watch((value) => {
      onFiltersChange(value as TranslationsFilter);
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
  onExport?: () => void;
  onConfigure?: () => void;
  defaultLocale?: string;
};

export function TranslationsFilters({
  onFiltersChange,
  filterValues,
  onReset,
  className,
  isFetching,
  onExport = () => {},
  onConfigure = () => {},
  defaultLocale,
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
                <SearchFilter value={field.value} onChange={field.onChange} />
              </FormItem>
            )}
          />

          <FilterResetButton isVisible={isResetButtonVisible} isFetching={isFetching} onReset={handleReset} />
        </div>

        <ActionButtons onExport={onExport} onConfigure={onConfigure} defaultLocale={defaultLocale} />
      </FormRoot>
    </Form>
  );
}
