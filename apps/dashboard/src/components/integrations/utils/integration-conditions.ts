import { IMessageFilter } from '@novu/shared';
import { generateID, RuleGroupType } from 'react-querybuilder';
import type { EnhancedField } from '@/components/conditions-editor/conditions-editor';
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

export const INTEGRATION_CONDITION_FIELDS: EnhancedField[] = INTEGRATION_CONDITION_FIELD_DEFS.map((field) => ({
  name: field.name,
  label: field.name,
  value: field.name,
  dataType: field.dataType,
}));

export const INTEGRATION_CONDITION_VARIABLES: EnhancedLiquidVariable[] = INTEGRATION_CONDITION_FIELD_DEFS.map(
  (field) => ({
    name: field.name,
    displayLabel: field.name,
    dataType: field.dataType,
  })
);

const ALLOWED_PREFIXES = ['context.', 'subscriber.'] as const;

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
