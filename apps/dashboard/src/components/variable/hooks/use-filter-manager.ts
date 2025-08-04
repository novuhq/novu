import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFilters } from '../constants';
import type { FilterWithParam } from '../types';

type UseFilterManagerProps = {
  initialFilters: FilterWithParam[];
  onUpdate: (filters: FilterWithParam[]) => void;
};

export function useFilterManager({ initialFilters, onUpdate }: UseFilterManagerProps) {
  const liquidFilters = useMemo(() => getFilters(), []);
  const [filters, setFilters] = useState<FilterWithParam[]>(initialFilters.filter((t) => t.value !== 'default'));

  useEffect(() => {
    setFilters(initialFilters.filter((t) => t.value !== 'default'));
  }, [initialFilters]);

  const handleReorder = useCallback(
    (newFilters: FilterWithParam[]) => {
      setFilters(newFilters);
      onUpdate(newFilters);
    },
    [onUpdate]
  );

  const handleFilterToggle = useCallback(
    (value: string) => {
      setFilters((current) => {
        const index = current.findIndex((t) => t.value === value);
        let newFilters: FilterWithParam[];

        if (index === -1) {
          const filterDef = liquidFilters.find((t) => t.value === value);
          const newFilter: FilterWithParam = {
            value,
            ...(filterDef?.hasParam
              ? {
                  params: filterDef.params?.map((param) => {
                    return param.defaultValue || '';
                  }),
                }
              : {}),
          };

          newFilters = [...current, newFilter];
        } else {
          newFilters = current.filter((_, i) => i !== index);
        }

        onUpdate(newFilters);
        return newFilters;
      });
    },
    [onUpdate, liquidFilters]
  );

  const handleParamChange = useCallback(
    (index: number, params: string[]) => {
      setFilters((current) => {
        const newFilters = [...current];
        const filterDef = liquidFilters.find((def) => def.value === newFilters[index].value);

        // Format params based on their types
        const formattedParams = params.map((param, paramIndex) => {
          const paramType = filterDef?.params?.[paramIndex]?.type;

          if (paramType === 'number') {
            const numericValue = String(param).replace(/[^\d.-]/g, '');
            return isNaN(Number(numericValue)) ? '' : numericValue;
          }

          return param;
        });

        newFilters[index] = { ...newFilters[index], params: formattedParams };
        onUpdate(newFilters);
        return newFilters;
      });
    },
    [onUpdate, liquidFilters]
  );

  const getFilteredFilters = useCallback(
    (query: string) => {
      const currentFilterValues = filters.map((t) => t.value);
      return liquidFilters.filter(
        (t) =>
          !currentFilterValues.includes(t.value) &&
          (t.label.toLowerCase().includes(query.toLowerCase()) ||
            t.description?.toLowerCase().includes(query.toLowerCase()))
      );
    },
    [filters, liquidFilters]
  );

  return {
    filters,
    handleFilterToggle,
    handleReorder,
    handleParamChange,
    getFilteredFilters,
  };
}
