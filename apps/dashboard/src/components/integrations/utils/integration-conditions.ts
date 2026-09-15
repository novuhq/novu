import { IMessageFilter } from '@novu/shared';
import { generateID, RuleGroupType } from 'react-querybuilder';
import type { EnhancedLiquidVariable, FieldDataType, IsAllowedVariable } from '@/utils/parseStepVariables';

const INTEGRATION_CONDITION_FIELD_DEFS: Array<{ name: string; dataType: FieldDataType }> = [
  { name: 'context.tenant.id', dataType: 'string' },
  { name: 'subscriber.subscriberId', dataType: 'string' },
  { name: 'subscriber.email', dataType: 'string' },
  { name: 'subscriber.phone', dataType: 'string' },
  { name: 'subscriber.firstName', dataType: 'string' },
  { name: 'subscriber.lastName', dataType: 'string' },
  { name: 'subscriber.locale', dataType: 'string' },
  { name: 'subscriber.data', dataType: 'object' },
];

export const INTEGRATION_CONDITION_VARIABLES: EnhancedLiquidVariable[] = INTEGRATION_CONDITION_FIELD_DEFS.map(
  (field) => ({
    name: field.name,
    displayLabel: field.name,
    dataType: field.dataType,
  })
);

export function mergeIntegrationConditionVariables(variables: EnhancedLiquidVariable[]): EnhancedLiquidVariable[] {
  const variablesByName = new Map<string, EnhancedLiquidVariable>();

  for (const variable of variables) {
    const existingVariable = variablesByName.get(variable.name);

    if (!existingVariable) {
      variablesByName.set(variable.name, variable);
      continue;
    }

    if (existingVariable.dataType !== variable.dataType) {
      variablesByName.set(variable.name, {
        ...existingVariable,
        displayLabel: `${variable.name} (mixed types)`,
        // Restrict ambiguous fields to type-agnostic null checks instead of choosing either schema's value semantics.
        dataType: 'object',
        format: undefined,
        inputType: undefined,
      });
    }
  }

  return Array.from(variablesByName.values());
}

const ALLOWED_PREFIXES = ['context.', 'payload.', 'subscriber.'] as const;

export const isAllowedIntegrationConditionVariable: IsAllowedVariable = (variable) => {
  if (variable.name === 'subscriber.data') {
    return true;
  }

  return ALLOWED_PREFIXES.some((prefix) => variable.name.startsWith(prefix) && variable.name.length > prefix.length);
};

export function countLegacyIntegrationConditions(conditions?: IMessageFilter[]): number {
  if (!conditions?.length) {
    return 0;
  }

  return conditions.reduce((sum, group) => sum + (group.children?.length ?? 0), 0);
}

export function createEmptyConditionsQuery(): RuleGroupType {
  return { id: generateID(), combinator: 'and', rules: [] };
}
