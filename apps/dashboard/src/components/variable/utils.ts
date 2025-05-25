import { getFilters } from './constants';
import { FilterWithParam } from './types';

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'");
}

export function formatParamValue(param: string, type?: string) {
  if (type === 'number') {
    return param;
  }

  return `'${escapeString(param)}'`;
}

export function formatLiquidVariable(name: string, defaultValue: string, filters: FilterWithParam[]) {
  const parts = [name.trim()];

  if (defaultValue) {
    parts.push(`default: '${escapeString(defaultValue.trim())}'`);
  }

  filters.forEach((t) => {
    if (t.value === 'default') return;

    if (!t.params?.length) {
      parts.push(t.value);
    } else {
      const filterDef = getFilters().find((def) => def.value === t.value);
      const formattedParams = t.params.map((param, index) => formatParamValue(param, filterDef?.params?.[index]?.type));

      parts.push(`${t.value}: ${formattedParams.join(', ')}`);
    }
  });

  return `{{${parts.join(' | ')}}}`;
}

export function validateEnhancedDigestFilters(filters: string[]): {
  message: string;
  name: string;
  filterParam: string;
} | null {
  const toSentenceFilter = filters.find((f) => f.startsWith('toSentence'));

  if (toSentenceFilter) {
    const firstParam = toSentenceFilter.split(':')[1]?.split(',')[0]?.trim();
    const isFirstParamEmpty = !firstParam || firstParam === '' || firstParam === "''" || firstParam === '""';

    if (isFirstParamEmpty) {
      return { message: 'Object key path is required', name: 'toSentence', filterParam: 'Object key path' };
    }
  }

  return null;
}

export const parseParams = (input: string) => {
  if (!input) return '';
  return input
    .split(',')
    .map((param) => {
      const trimmed = param.trim();

      if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return trimmed.slice(1, -1);
      }

      return trimmed;
    })
    .join(', ');
};

export const getFirstFilterAndItsArgs = (filters: string[]) => {
  const firstFilter = filters[0];
  const firstFilterName = firstFilter.split(':')[0];
  const firstFilterParams = firstFilter.split(':')[1]?.split(',')?.[0];
  const parsedFilterParams = parseParams(firstFilterParams);
  const finalParam = parsedFilterParams.length > 0 ? parsedFilterParams : null;

  return {
    firstFilterName,
    finalParam,
    firstFilter,
  };
};
