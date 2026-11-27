import {
  IMessageFilter,
  INTEGRATION_CONDITION_NAMESPACES,
  INTEGRATION_CONDITION_VARIABLES as INTEGRATION_CONDITION_VARIABLE_NAMES,
} from '@novu/shared';
import { formatQuery, type RuleGroupType } from 'react-querybuilder';
import { type JsonLogicRule, parseLosslessRule } from '@/components/conditions-editor/lossless-rule';
import type { EnhancedConditionVariable } from '@/components/conditions-editor/types';
import { customRuleProcessor } from '@/utils/conditions';
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

/** Returns null for stored rules the editor can't show without changing them, such as `notIn`. */
export function parseIntegrationRules(rules: JsonLogicRule): RuleGroupType | null {
  return parseLosslessRule(rules, { format: toIntegrationRules });
}

export function toIntegrationRules(query: RuleGroupType): JsonLogicRule | null {
  if (!query.rules.length) {
    return null;
  }

  const logic = formatQuery(query, { format: 'jsonlogic', ruleProcessor: customRuleProcessor });

  return logic && typeof logic === 'object' ? (logic as JsonLogicRule) : null;
}
