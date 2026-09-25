import {
  IMessageFilter,
  INTEGRATION_CONDITION_NAMESPACES,
  INTEGRATION_CONDITION_VARIABLES as INTEGRATION_CONDITION_VARIABLE_NAMES,
} from '@novu/shared';
import { generateID, RuleGroupType } from 'react-querybuilder';
import type { EnhancedConditionVariable } from '@/components/conditions-editor/types';
import { type FieldDataType, type IsAllowedVariable } from '@/utils/parseStepVariables';

const INTEGRATION_CONDITION_VARIABLE_TYPES: Record<
  (typeof INTEGRATION_CONDITION_VARIABLE_NAMES)[number],
  FieldDataType
> = {
  'context.tenant.id': 'string',
  'subscriber.subscriberId': 'string',
  'subscriber.email': 'string',
  'subscriber.phone': 'string',
  'subscriber.firstName': 'string',
  'subscriber.lastName': 'string',
  'subscriber.locale': 'string',
  'subscriber.data': 'object',
  'workflow.workflowId': 'string',
  'workflow.name': 'string',
  'workflow.description': 'string',
  'workflow.tags': 'array',
  'workflow.severity': 'string',
};

export const INTEGRATION_CONDITION_VARIABLES: EnhancedConditionVariable[] = INTEGRATION_CONDITION_VARIABLE_NAMES.map(
  (name) => ({
    name,
    displayLabel: name,
    dataType: INTEGRATION_CONDITION_VARIABLE_TYPES[name],
  })
);

export function mergeIntegrationConditionVariables(
  variables: EnhancedConditionVariable[]
): EnhancedConditionVariable[] {
  const variablesByName = new Map<string, EnhancedConditionVariable>();

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
        dataType: 'mixed',
        format: undefined,
        inputType: undefined,
      });
    }
  }

  return Array.from(variablesByName.values());
}

export const isAllowedIntegrationConditionVariable: IsAllowedVariable = (variable) => {
  if ((INTEGRATION_CONDITION_VARIABLE_NAMES as readonly string[]).includes(variable.name)) {
    return true;
  }

  return INTEGRATION_CONDITION_NAMESPACES.some(
    (prefix) => variable.name.startsWith(prefix) && variable.name.length > prefix.length
  );
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
