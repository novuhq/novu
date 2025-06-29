import { HTMLAttributes, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiDownloadLine, RiLoader4Line, RiSettings4Line } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import {
  defaultTranslationsFilter,
  TranslationsFilter,
} from '@/components/translations/hooks/use-translations-url-state';
import { cn } from '@/utils/ui';

export type TranslationsFiltersProps = HTMLAttributes<HTMLFormElement> & {
  onFiltersChange: (filter: TranslationsFilter) => void;
  filterValues: TranslationsFilter;
  onReset?: () => void;
  isFetching?: boolean;
};

export function TranslationsFilters(props: TranslationsFiltersProps) {
  const { onFiltersChange, filterValues, onReset, className, isFetching, ...rest } = props;

  const form = useForm<TranslationsFilter>({
    values: filterValues,
    defaultValues: {
      ...filterValues,
    },
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

  return (
    <Form {...form}>
      <FormRoot className={cn('flex w-full items-center justify-between gap-2', className)} {...rest}>
        <div className="flex flex-1 items-center gap-2">
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem className="relative">
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Search"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search translations..."
                />
              </FormItem>
            )}
          />

          {isResetButtonVisible && (
            <div className="flex items-center gap-1">
              <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset}>
                Reset
              </Button>
              {isFetching && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" mode="lighter" size="xs" className="!w-8" onClick={() => {}}>
            <RiDownloadLine className="h-3 w-3" />
          </Button>

          <button className="group flex h-8 items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-xs hover:bg-neutral-50 focus:bg-neutral-100">
            <span className="px-3 py-2">Default locale</span>
            <span className="border-l border-neutral-200 bg-white p-2 font-medium text-neutral-700 group-hover:bg-neutral-50">
              en_US
            </span>
          </button>

          <Button variant="secondary" mode="lighter" size="xs" onClick={() => {}}>
            <RiSettings4Line className="mr-2 h-4 w-4" />
            Configure translations
          </Button>
        </div>
      </FormRoot>
    </Form>
  );
}
