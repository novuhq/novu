import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { DEFAULT_CONTEXT_LABEL, DEFAULT_CONTEXT_VALUE } from '@/utils/context-variable-utils';
import { FacetedFormFilter } from '../primitives/form/faceted-filter/facated-form-filter';

type ContextFilterProps = {
  contextKeys: string[];
  onContextKeysChange: (keys: string[]) => void;
  defaultOnClear?: boolean;
  size?: 'small' | 'default';
  disabled?: boolean;
};

export function ContextFilter({
  contextKeys,
  onContextKeysChange,
  defaultOnClear = false,
  size = 'default',
  disabled = false,
}: ContextFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { data: contextsData, isLoading } = useFetchContexts({
    limit: 50,
    search: debouncedSearch,
  });

  const contextOptions = useMemo(() => {
    const defaultOption = { value: DEFAULT_CONTEXT_VALUE, label: DEFAULT_CONTEXT_LABEL };
    const regularOptions =
      contextsData?.data?.map((context) => {
        const contextKey = `${context.type}:${context.id}`;
        return { value: contextKey, label: contextKey };
      }) || [];

    return [defaultOption, ...regularOptions];
  }, [contextsData]);

  const handleSelect = (newValues: string[]) => {
    // If cleared and defaultOnClear is true, set to default context
    if (newValues.length === 0 && defaultOnClear) {
      onContextKeysChange([DEFAULT_CONTEXT_VALUE]);

      return;
    }

    // Find what was just added
    const addedValue = newValues.find((v) => !contextKeys.includes(v));

    // If default was just added, clear everything else
    if (addedValue === DEFAULT_CONTEXT_VALUE) {
      onContextKeysChange([DEFAULT_CONTEXT_VALUE]);

      return;
    }

    // If anything else was added, remove default if it exists
    if (addedValue && newValues.includes(DEFAULT_CONTEXT_VALUE)) {
      onContextKeysChange(newValues.filter((v) => v !== DEFAULT_CONTEXT_VALUE));

      return;
    }

    // Otherwise just set the values as-is
    onContextKeysChange(newValues);
  };

  return (
    <FacetedFormFilter
      type="multi"
      size={size}
      title="Context"
      options={contextOptions}
      selected={contextKeys}
      onSelect={handleSelect}
      placeholder="e.g., tenant:acme, project:alpha"
      disabled={disabled}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      isLoading={isLoading}
    />
  );
}
