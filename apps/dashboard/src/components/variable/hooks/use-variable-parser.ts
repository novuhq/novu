import { Tokenizer, TokenKind } from 'liquidjs';
import { useCallback, useMemo } from 'react';
import { getFilters } from '../constants';
import { FilterWithParam } from '../types';

type ParsedVariable = {
  parsedName: string;
  parsedDefaultValue: string;
  parsedFilters: FilterWithParam[];
};

export function useVariableParser(
  variable: string,
  aliasFor?: string
): {
  parsedName: string;
  parsedAliasForRoot: string;
  parsedDefaultValue: string;
  parsedFilters: FilterWithParam[];
  originalVariable: string;
  parseRawInput: (value: string) => ParsedVariable;
} {
  const parseResult = useMemo(() => {
    if (!variable) {
      return {
        parsedName: '',
        parsedAliasForRoot: '',
        parsedDefaultValue: '',
        parsedFilters: [],
        originalVariable: '',
      };
    }

    try {
      const cleanVariable = cleanLiquidSyntax(variable);
      const { parsedName, parsedDefaultValue, parsedFilters = [] } = parseVariableContent(cleanVariable);

      if (aliasFor) {
        const variableRest = variable.split('.').slice(1).join('.');
        const normalizedVariableRest = variableRest.startsWith('.') ? variableRest.substring(1) : variableRest;
        const parsedAliasForRoot = normalizedVariableRest
          ? aliasFor.replace(`.${normalizedVariableRest}`, '')
          : aliasFor;

        return {
          parsedName,
          parsedAliasForRoot,
          parsedDefaultValue,
          parsedFilters,
          originalVariable: variable,
        };
      }

      return {
        parsedName,
        parsedAliasForRoot: '',
        parsedDefaultValue,
        parsedFilters,
        originalVariable: variable,
      };
    } catch (error) {
      console.error('Error parsing variable:', error);
      return {
        parsedName: '',
        parsedAliasForRoot: '',
        parsedDefaultValue: '',
        parsedFilters: [],
        originalVariable: variable,
      };
    }
  }, [variable, aliasFor]);

  const parseRawInput = useCallback((value: string) => parseRawLiquid(value), []);

  return {
    ...parseResult,
    parseRawInput,
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
        getFilters().some((t) => t.value === filter.name)
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

function parseRawLiquid(value: string): ParsedVariable {
  const content = cleanLiquidSyntax(value);
  const { parsedName, parsedDefaultValue, parsedFilters = [] } = parseVariableContent(content);
  return { parsedName, parsedDefaultValue, parsedFilters };
}
