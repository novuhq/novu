import { Tokenizer, TokenKind } from 'liquidjs';
import { useMemo } from 'react';
import { FILTERS } from '../constants';
import { FilterWithParam } from '../types';

type ParsedVariable = {
  parsedName: string;
  parsedDefaultValue: string;
  parsedFilters: FilterWithParam[];
};

export function useVariableParser(variable: string): {
  parsedName: string;
  parsedDefaultValue: string;
  parsedFilters: FilterWithParam[];
  originalVariable: string;
  parseRawInput: (value: string) => ParsedVariable;
} {
  const parseResult = useMemo(() => {
    if (!variable) {
      return { parsedName: '', parsedDefaultValue: '', parsedFilters: [], originalVariable: '' };
    }

    try {
      const cleanVariable = cleanLiquidSyntax(variable);
      const { parsedName, parsedDefaultValue, parsedFilters = [] } = parseVariableContent(cleanVariable);

      return {
        parsedName,
        parsedDefaultValue,
        parsedFilters,
        originalVariable: variable,
      };
    } catch (error) {
      console.error('Error parsing variable:', error);
      return { parsedName: '', parsedDefaultValue: '', parsedFilters: [], originalVariable: variable };
    }
  }, [variable]);

  return {
    ...parseResult,
    parseRawInput: parseRawLiquid,
  };
}

function parseVariableContent(content: string): ParsedVariable {
  // Split by pipe and trim each part
  const [variableName, ...filterParts] = content.split('|').map((part) => part.trim());
  const parsedName = variableName;
  let parsedDefaultValue = '';
  const parsedFilters: FilterWithParam[] = [];

  if (filterParts.length > 0) {
    const filterTokenizer = new Tokenizer('|' + filterParts.join('|'));
    const filters = filterTokenizer.readFilters();

    // First pass: find default value
    for (const filter of filters) {
      if (filter.kind === TokenKind.Filter && filter.name === 'default' && filter.args.length > 0) {
        parsedDefaultValue = (filter.args[0] as any).content;
        break;
      }
    }

    // Second pass: collect other filters
    for (const filter of filters) {
      if (
        filter.kind === TokenKind.Filter &&
        filter.name !== 'default' &&
        FILTERS.some((t) => t.value === filter.name)
      ) {
        parsedFilters.push({
          value: filter.name,
          ...(filter.args.length > 0
            ? {
                params: filter.args.map((arg) => {
                  return (arg as any).content;
                }),
              }
            : {}),
        });
      }
    }
  }

  return {
    parsedName,
    parsedDefaultValue,
    parsedFilters,
  };
}

function cleanLiquidSyntax(value: string): string {
  return value.replace(/^\{\{|\}\}$/g, '').trim();
}

export function parseRawLiquid(value: string): ParsedVariable {
  const content = cleanLiquidSyntax(value);
  const { parsedName, parsedDefaultValue, parsedFilters = [] } = parseVariableContent(content);
  return { parsedName, parsedDefaultValue, parsedFilters };
}
