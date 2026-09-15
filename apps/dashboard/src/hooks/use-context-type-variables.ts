import { useMemo } from 'react';
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { isDangerousObjectKey } from '@/utils/context-variable-utils';
import { type EnhancedLiquidVariable, type FieldDataType } from '@/utils/parseStepVariables';

const MAX_CONTEXT_DATA_DEPTH = 5;

type ContextVariableSource = {
  type?: string;
  data?: unknown;
};

function getDataType(value: unknown): FieldDataType {
  if (Array.isArray(value)) {
    return 'array';
  }

  switch (typeof value) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return value === null ? 'string' : 'object';
    default:
      return 'string';
  }
}

function collectDataVariables(obj: Record<string, unknown>, prefix: string, depth = 0): EnhancedLiquidVariable[] {
  const variables: EnhancedLiquidVariable[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (isDangerousObjectKey(key)) continue;

    const name = `${prefix}.${key}`;
    variables.push({ name, dataType: getDataType(value) });

    if (depth < MAX_CONTEXT_DATA_DEPTH && value && typeof value === 'object' && !Array.isArray(value)) {
      variables.push(...collectDataVariables(value as Record<string, unknown>, name, depth + 1));
    }
  }

  return variables;
}

export function buildContextTypeVariables(contexts: ContextVariableSource[]): EnhancedLiquidVariable[] {
  const seenNames = new Set<string>();
  const variables: EnhancedLiquidVariable[] = [];

  const add = (variable: EnhancedLiquidVariable) => {
    if (seenNames.has(variable.name)) return;
    seenNames.add(variable.name);
    variables.push(variable);
  };

  for (const context of contexts) {
    if (!context.type) continue;

    add({ name: `context.${context.type}.id`, dataType: 'string' });
    add({ name: `context.${context.type}.data`, dataType: 'object' });

    if (context.data && typeof context.data === 'object' && Object.keys(context.data).length > 0) {
      const dataVariables = collectDataVariables(
        context.data as Record<string, unknown>,
        `context.${context.type}.data`
      );

      for (const variable of dataVariables) {
        add(variable);
      }
    }
  }

  return variables;
}

export function useContextTypeVariables(): EnhancedLiquidVariable[] {
  const { data: contextsData } = useFetchContexts({ limit: 50 }, { staleTime: 30_000 });

  return useMemo(() => buildContextTypeVariables(contextsData?.data ?? []), [contextsData]);
}
