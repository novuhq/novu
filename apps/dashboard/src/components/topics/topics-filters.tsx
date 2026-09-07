import { useQueryClient } from '@tanstack/react-query';
import { HTMLAttributes, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { RiLoader4Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { TopicsFilter } from './hooks/use-topics-url-state';

type FilterFormValues = {
  key: string;
  name: string;
};

export type TopicsFiltersProps = HTMLAttributes<HTMLFormElement> & {
  onFiltersChange: (filter: Partial<TopicsFilter>) => void;
  filterValues: TopicsFilter;
  onReset?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
};

export const TopicsFilters = (props: TopicsFiltersProps) => {
  const { className, onFiltersChange, filterValues, onReset, isLoading, isFetching, ...rest } = props;
  const queryClient = useQueryClient();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Combine parent loading state with local loading state
  const isFiltersLoading = isLoading;

  const defaultValues = useMemo<FilterFormValues>(
    () => ({
      key: filterValues.key || '',
      name: filterValues.name || '',
    }),
    [filterValues.key, filterValues.name]
  );

  const form = useForm<FilterFormValues>({
    defaultValues,
  });

  // Update form values when filter values change (like after a reset)
  useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  const clearDebounceTimeout = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  const debouncedFilterChange = useCallback(
    (fieldName: keyof FilterFormValues, value: string) => {
      clearDebounceTimeout();

      debounceTimeoutRef.current = setTimeout(() => {
        // Cancel any in-flight requests
        queryClient.cancelQueries({ queryKey: [QueryKeys.fetchTopics] });

        // If empty, explicitly pass undefined to remove the filter
        // Otherwise, pass the value to update the filter
        onFiltersChange({
          [fieldName]: value.trim() ? value : undefined,
        });

        // Note: We don't immediately clear loading state here
        // The parent component should handle this when data is loaded
        debounceTimeoutRef.current = null;
      }, 400);
    },
    [clearDebounceTimeout, onFiltersChange, queryClient]
  );

  const handleFieldChange = useCallback(
    (fieldName: keyof FilterFormValues, value: string) => {
      form.setValue(fieldName, value);
      debouncedFilterChange(fieldName, value);
    },
    [form, debouncedFilterChange]
  );

  const handleReset = useCallback(() => {
    clearDebounceTimeout();

    // Reset form state
    form.reset({ key: '', name: '' });

    // Cancel any pending requests
    queryClient.cancelQueries({ queryKey: [QueryKeys.fetchTopics] });

    // Call the parent reset handler
    if (onReset) {
      onReset();
    }
  }, [clearDebounceTimeout, form, onReset, queryClient]);

  // Clean up timeout on unmount
  useEffect(() => {
    return clearDebounceTimeout;
  }, [clearDebounceTimeout]);

  const filterHasValue = !!filterValues.key || !!filterValues.name;
  const keyValue = form.watch('key');
  const nameValue = form.watch('name');

  return (
    <div className={isFiltersLoading ? 'pointer-events-none opacity-70' : ''}>
      <Form {...form}>
        <FormRoot className={cn('flex items-center gap-2', className)} {...rest}>
          <FormField
            control={form.control}
            name="name"
            render={() => (
              <FormItem className="relative">
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Name"
                  value={nameValue}
                  onChange={(value) => handleFieldChange('name', value)}
                  placeholder="Search by topic name"
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="key"
            render={() => (
              <FormItem className="relative">
                <FacetedFormFilter
                  type="text"
                  size="small"
                  title="Key"
                  value={keyValue}
                  onChange={(value) => handleFieldChange('key', value)}
                  placeholder="Search by topic key"
                />
              </FormItem>
            )}
          />

          {filterHasValue && (
            <div className="flex items-center gap-1">
              <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset} disabled={isFiltersLoading}>
                Reset
              </Button>
              {isFetching && !isFiltersLoading && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
            </div>
          )}
        </FormRoot>
      </Form>
    </div>
  );
};
