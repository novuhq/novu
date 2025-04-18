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

export function formatLiquidVariable(
  name: string,
  defaultValue: string,
  filters: FilterWithParam[],
  isEnhancedDigestEnabled: boolean
) {
  const parts = [name.trim()];

  if (defaultValue) {
    parts.push(`default: '${escapeString(defaultValue.trim())}'`);
  }

  filters.forEach((t) => {
    if (t.value === 'default') return;

    if (!t.params?.length) {
      parts.push(t.value);
    } else {
      const filterDef = getFilters(isEnhancedDigestEnabled).find((def) => def.value === t.value);
      const formattedParams = t.params.map((param, index) => formatParamValue(param, filterDef?.params?.[index]?.type));

      parts.push(`${t.value}: ${formattedParams.join(', ')}`);
    }
  });

  return `{{${parts.join(' | ')}}}`;
}

export function extractIssuesFromVariable(filters: string[], isEnhancedDigestEnabled: boolean) {
  const allFilters = getFilters(isEnhancedDigestEnabled);

  const filtersWithIssues = filters
    .map((filterStr) => {
      if (!filterStr) return null;

      const [filterNameRaw, filterParamsRaw = ''] = filterStr.split(':');
      const filterName = filterNameRaw?.trim();
      const filterParams = filterParamsRaw?.split(',').map((p) => (p ?? '').trim());

      if (!filterName) return null;

      const filterDefinition = allFilters.find((f) => f.value === filterName);
      if (!filterDefinition || !Array.isArray(filterDefinition.params)) return null;

      const issues = filterDefinition.params
        .map((paramDef, index) => {
          const isRequired = paramDef.required;
          const paramValue = filterParams[index];

          const isMissing =
            isRequired &&
            (!paramValue || paramValue.trim() === '' || paramValue.trim() === "''" || paramValue.trim() === '""');

          if (isMissing) {
            return {
              param: paramDef.placeholder,
              issue: `${paramDef.placeholder} is required`,
            };
          }

          return null;
        })
        .filter((issue) => issue !== null);

      return issues.length > 0 ? { filterName, issues } : null;
    })
    .filter((f): f is { filterName: string; issues: { param: string; issue: string }[] } => f !== null);

  return filtersWithIssues;
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
