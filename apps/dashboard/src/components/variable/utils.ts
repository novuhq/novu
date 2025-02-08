import { FILTERS } from './constants';
import { FilterWithParam } from './types';

function escapeString(str: string): string {
  return str.replace(/'/g, "\\'");
}

export function formatParamValue(param: string, type?: 'string' | 'number') {
  if (type === 'number') {
    return param;
  }
  return `'${escapeString(param)}'`;
}

export function getDefaultSampleValue(filterValue: string): string {
  return FILTERS.find((filter) => filter.value === filterValue)?.sampleValue ?? '';
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
      const filterDef = FILTERS.find((def) => def.value === t.value);
      const formattedParams = t.params.map((param, index) => formatParamValue(param, filterDef?.params?.[index]?.type));

      parts.push(`${t.value}: ${formattedParams.join(', ')}`);
    }
  });

  return `{{${parts.join(' | ')}}}`;
}
