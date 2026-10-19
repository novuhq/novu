import { useMemo } from 'react';

import { getFilters } from '../constants';
import { Filters, FilterWithParam } from '../types';

type SuggestionGroup = {
  label: string;
  filters: Filters[];
};

export function useSuggestedFilters(variableName: string, currentFilters: FilterWithParam[]): SuggestionGroup[] {
  const liquidFilters = useMemo(() => getFilters(), []);

  return useMemo(() => {
    const currentFilterValues = new Set(currentFilters.map((f) => f.value));
    const suggestedFilters: Filters[] = [];

    const addSuggestions = (filterValues: string[]) => {
      const newFilters = liquidFilters.filter(
        (f) => filterValues.includes(f.value) && !currentFilterValues.has(f.value)
      );

      suggestedFilters.push(...newFilters);
    };

    if (isStepsEventsPattern(variableName)) {
      addSuggestions(['digest']);
    }

    if (isDateVariable(variableName)) {
      addSuggestions(['date']);
    }

    if (isNumberVariable(variableName)) {
      addSuggestions(['round', 'floor', 'ceil', 'abs', 'plus', 'minus', 'times', 'divided_by']);
    }

    if (isArrayVariable(variableName)) {
      addSuggestions(['first', 'last', 'join', 'map', 'where', 'size']);
    }

    if (isTextVariable(variableName)) {
      addSuggestions(['upcase', 'downcase', 'capitalize', 'truncate', 'truncatewords']);
    }

    return suggestedFilters.length > 0 ? [{ label: 'Suggested', filters: suggestedFilters }] : [];
  }, [variableName, currentFilters, liquidFilters]);
}

function isDateVariable(name: string): boolean {
  const datePatterns = ['date', 'time', 'created', 'updated', 'timestamp', 'scheduled'];

  return datePatterns.some((pattern) => name.toLowerCase().includes(pattern));
}

function isNumberVariable(name: string): boolean {
  const numberPatterns = ['count', 'amount', 'total', 'price', 'quantity', 'number', 'sum', 'age'];

  return numberPatterns.some((pattern) => name.toLowerCase().includes(pattern));
}

function isArrayVariable(name: string): boolean {
  const arrayPatterns = ['list', 'array', 'items', 'collection', 'set', 'group', 'events'];

  return arrayPatterns.some((pattern) => name.toLowerCase().includes(pattern));
}

function isTextVariable(name: string): boolean {
  const textPatterns = ['name', 'title', 'description', 'text', 'message', 'content', 'label'];

  return textPatterns.some((pattern) => name.toLowerCase().includes(pattern));
}

function isStepsEventsPattern(name: string): boolean {
  return /^steps\..*\.events$/.test(name);
}
