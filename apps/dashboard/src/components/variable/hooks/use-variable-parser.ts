import { Tokenizer, TokenKind } from 'liquidjs';
import { useMemo, useCallback } from 'react';
import { getFilters } from '../constants';
import { FilterWithParam } from '../types';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

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
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);

  const parseResult = useMemo(() => {
    if (!variable) {
      return { parsedName: '', parsedDefaultValue: '', parsedFilters: [], originalVariable: '' };
    }

    try {
      const cleanVariable = cleanLiquidSyntax(variable);
      const {
        parsedName,
        parsedDefaultValue,
        parsedFilters = [],
      } = parseVariableContent(cleanVariable, isEnhancedDigestEnabled);

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

  const parseRawInput = useCallback(
    (value: string) => parseRawLiquid(value, isEnhancedDigestEnabled),
    [isEnhancedDigestEnabled]
  );

  return {
    ...parseResult,
    parseRawInput,
  };
}

function parseVariableContent(content: string, isEnhancedDigestEnabled: boolean): ParsedVariable {
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
        getFilters(isEnhancedDigestEnabled).some((t) => t.value === filter.name)
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

function parseRawLiquid(value: string, isEnhancedDigestEnabled: boolean): ParsedVariable {
  const content = cleanLiquidSyntax(value);
  const { parsedName, parsedDefaultValue, parsedFilters = [] } = parseVariableContent(content, isEnhancedDigestEnabled);
  return { parsedName, parsedDefaultValue, parsedFilters };
}
