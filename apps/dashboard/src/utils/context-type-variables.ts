import type { ConditionFieldDataType, EnhancedConditionVariable } from '@/components/conditions-editor/types';
import { isDangerousObjectKey } from '@/utils/context-variable-utils';

const MAX_CONTEXT_DATA_DEPTH = 5;

type ContextVariableSource = {
  type?: string;
  data?: unknown;
};

function getDataType(value: unknown): ConditionFieldDataType {
  if (Array.isArray(value)) {
    return 'array';
  }

  switch (typeof value) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return value === null ? 'mixed' : 'object';
    default:
      return 'string';
  }
}

function collectDataVariables(obj: Record<string, unknown>, prefix: string, depth = 0): EnhancedConditionVariable[] {
  const variables: EnhancedConditionVariable[] = [];

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

export function buildContextTypeVariables(contexts: ContextVariableSource[]): EnhancedConditionVariable[] {
  const variablesByName = new Map<string, EnhancedConditionVariable>();

  const add = (variable: EnhancedConditionVariable) => {
    const existingVariable = variablesByName.get(variable.name);

    if (existingVariable && existingVariable.dataType !== variable.dataType) {
      variablesByName.set(variable.name, { ...existingVariable, dataType: 'mixed' });
    } else if (!existingVariable) {
      variablesByName.set(variable.name, variable);
    }
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

  return Array.from(variablesByName.values());
}
