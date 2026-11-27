import { ACCESS_RULE_SUBSCRIBER_FIELDS, isAccessRuleField } from '@novu/shared';
import isEqual from 'lodash.isequal';
import {
  formatQuery,
  generateID,
  isRuleGroup,
  type RQBJsonLogic,
  type RuleGroupType,
  type RuleGroupTypeAny,
  type RuleType,
} from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { isArrayItemOperator } from '@/components/conditions-editor/array-item-condition';
import { isRelativeDateOperator } from '@/components/conditions-editor/field-type-operators';
import type { ConditionFieldDataType, EnhancedConditionVariable } from '@/components/conditions-editor/types';
import { customRuleProcessor, parseJsonLogicOptions } from '@/utils/conditions';

export type AgentAccessRule = Record<string, unknown>;

export const ACCESS_RULE_SUBSCRIBER_VARIABLES: EnhancedConditionVariable[] = ACCESS_RULE_SUBSCRIBER_FIELDS.map(
  (field) => ({ name: `subscriber.${field}`, dataType: field === 'data' ? 'object' : 'string' })
);

const FIELD_ISSUE =
  'Access rules can only use subscriber.<field>, subscriber.data.<key>, context.<type>.id or context.<type>.data.<key>';
const OPERATOR_ISSUE = 'Access rules do not support this operator';

export function getAccessRuleFieldIssue(field: string): string | null {
  return isAccessRuleField(field) ? null : FIELD_ISSUE;
}

export function getAccessRuleOperatorIssue(operator: string): string | null {
  return isRelativeDateOperator(operator) || isArrayItemOperator(operator) ? OPERATOR_ISSUE : null;
}

export function createEmptyAccessRuleQuery(): RuleGroupType {
  return { id: generateID(), combinator: 'and', rules: [] };
}

/**
 * Returns null when the editor can't show the rule as stored, so saving it from the editor would change it.
 */
export function hasConditions(group: RuleGroupTypeAny): boolean {
  return group.rules.some((rule) => typeof rule !== 'string' && (!isRuleGroup(rule) || hasConditions(rule)));
}

export function parseAccessRule(rule: AgentAccessRule | undefined): RuleGroupType | null {
  if (!rule) {
    return createEmptyAccessRuleQuery();
  }

  const query = withStoredValues(
    parseJsonLogic(rule as RQBJsonLogic, { generateIDs: true, ...parseJsonLogicOptions })
  ) as RuleGroupType;
  const saved = toAccessRule(query, []);

  return isEqual(saved, rule) || isEqual(saved, { and: [rule] }) ? query : null;
}

function withStoredValues(group: RuleGroupTypeAny): RuleGroupTypeAny {
  return {
    ...group,
    rules: group.rules.map((rule) => {
      if (typeof rule === 'string') return rule;
      if (isRuleGroup(rule)) return withStoredValues(rule);
      if (!['string', 'number', 'boolean'].includes(typeof rule.value)) return rule;

      return { ...rule, value: String(rule.value), storedValue: rule.value };
    }),
  } as RuleGroupTypeAny;
}

export function toAccessRule(query: RuleGroupType, variables: EnhancedConditionVariable[]): AgentAccessRule | null {
  const dataTypes = new Map(variables.map((variable) => [variable.name, variable.dataType]));

  const logic = formatQuery(query, {
    format: 'jsonlogic',
    ruleProcessor: (rule, options) => {
      if ('storedValue' in rule && rule.value === String(rule.storedValue)) {
        return customRuleProcessor({ ...rule, value: rule.storedValue }, { ...options, parseNumbers: false });
      }

      const dataType = dataTypes.get(rule.field);

      return customRuleProcessor(withBooleanValue(rule, dataType), { ...options, parseNumbers: dataType === 'number' });
    },
  });

  return logic && typeof logic === 'object' ? (logic as AgentAccessRule) : null;
}

function withBooleanValue(rule: RuleType, dataType: ConditionFieldDataType | undefined): RuleType {
  const mayBeBoolean = dataType === 'boolean' || (dataType === undefined && rule.field.startsWith('subscriber.data.'));
  const comparesOneValue = rule.operator === '=' || rule.operator === '!=';

  if (mayBeBoolean && comparesOneValue && (rule.value === 'true' || rule.value === 'false')) {
    return { ...rule, value: rule.value === 'true' };
  }

  return rule;
}
