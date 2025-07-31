import { HTMLAttributes, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { RiLoader4Line } from 'react-icons/ri';
import { defaultLayoutsFilter, LayoutsFilter } from '@/components/layouts/hooks/use-layouts-url-state';
import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { cn } from '@/utils/ui';

export type LayoutsFiltersProps = HTMLAttributes<HTMLFormElement> & {
  onFiltersChange: (filter: LayoutsFilter) => void;
  filterValues: LayoutsFilter;
  onReset?: () => void;
  isFetching?: boolean;
};

export function LayoutsFilters(props: LayoutsFiltersProps) {
  const { onFiltersChange, filterValues, onReset, className, isFetching, ...rest } = props;

  const form = useForm<LayoutsFilter>({
    values: filterValues,
    defaultValues: {
      ...filterValues,
    },
  });
  const { formState, watch } = form;

  useEffect(() => {
    const subscription = watch((value) => {
      onFiltersChange(value as LayoutsFilter);
    });

    return () => subscription.unsubscribe();
  }, [watch, onFiltersChange]);

  const handleReset = () => {
    form.reset(defaultLayoutsFilter);
    onFiltersChange(defaultLayoutsFilter);
    onReset?.();
  };

  const isResetButtonVisible = formState.isDirty || filterValues.query !== '';

  return (
    <Form {...form}>
      <FormRoot className={cn('flex items-center gap-2', className)} {...rest}>
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
                placeholder="Search layouts..."
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
      </FormRoot>
    </Form>
  );
}
