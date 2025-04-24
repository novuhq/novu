import { Button } from '@/components/primitives/button';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { useQueryClient } from '@tanstack/react-query';
import { HTMLAttributes, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { TopicsFilter } from './hooks/use-topics-url-state';

export type TopicsFiltersProps = HTMLAttributes<HTMLFormElement> & {
  onFiltersChange: (filter: TopicsFilter) => void;
  filterValues: TopicsFilter;
  onReset?: () => void;
};

export const TopicsFilters = (props: TopicsFiltersProps) => {
  const { className, onFiltersChange, filterValues, onReset, ...rest } = props;
  const queryClient = useQueryClient();
  const [localKey, setLocalKey] = useState(filterValues.key || '');
  const [localName, setLocalName] = useState(filterValues.name || '');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const defaultValues = useMemo(
    () => ({
      key: filterValues.key || '',
      name: filterValues.name || '',
    }),
    [filterValues.key, filterValues.name]
  );

  const form = useForm({
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  // Update local state when filter values change (like after a reset)
  useEffect(() => {
    setLocalKey(filterValues.key || '');
    setLocalName(filterValues.name || '');
  }, [filterValues.key, filterValues.name]);

  const debouncedFilterChange = (updatedFilters: Partial<TopicsFilter>) => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Cancel any in-flight requests before applying new filters
      queryClient.cancelQueries({ queryKey: [QueryKeys.fetchTopics] });

      onFiltersChange(updatedFilters);

      debounceTimeoutRef.current = null;
    }, 400);
  };

  const handleKeyChange = (value: string) => {
    setLocalKey(value);
    form.setValue('key', value);
    debouncedFilterChange({
      key: value || undefined,
    });
  };

  const handleNameChange = (value: string) => {
    setLocalName(value);
    form.setValue('name', value);
    debouncedFilterChange({
      name: value || undefined,
    });
  };

  const handleReset = () => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Reset local state
    setLocalKey('');
    setLocalName('');
    form.reset({ key: '', name: '' });

    // Cancel any pending requests
    queryClient.cancelQueries({ queryKey: [QueryKeys.fetchTopics] });

    // Call the parent reset handler
    if (onReset) {
      onReset();
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const filterHasValue = !!filterValues.key || !!filterValues.name;

  return (
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
                value={localName}
                onChange={(value) => handleNameChange(value)}
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
                value={localKey}
                onChange={(value) => handleKeyChange(value)}
                placeholder="Search by topic key"
              />
            </FormItem>
          )}
        />

        {filterHasValue && (
          <Button variant="secondary" mode="ghost" size="2xs" onClick={handleReset}>
            Reset
          </Button>
        )}
      </FormRoot>
    </Form>
  );
};
