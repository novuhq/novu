import { ACCESS_RULE_SUBSCRIBER_FIELDS, INTEGRATION_RULE_OPERATORS, isAccessRuleField } from '@novu/shared';
import isEqual from 'lodash.isequal';
import {
  formatQuery,
  isRuleGroup,
  type RQBJsonLogic,
  type RuleGroupType,
  type RuleGroupTypeAny,
  type RuleType,
} from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { createEmptyConditionsQuery } from '@/components/conditions-editor/conditions-variables';
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

const ALLOWED_OPERATORS = new Set<string>(INTEGRATION_RULE_OPERATORS);

export function getAccessRuleOperatorIssue(rule: RuleType): string | null {
  const logic = customRuleProcessor(rule, { parseNumbers: false });

  return emitsOnlyAllowedOperators(logic) ? null : OPERATOR_ISSUE;
}

function emitsOnlyAllowedOperators(node: unknown): boolean {
  if (Array.isArray(node)) return node.every(emitsOnlyAllowedOperators);
  if (node === null || typeof node !== 'object') return true;

  return Object.entries(node).every(
    ([operator, args]) => ALLOWED_OPERATORS.has(operator) && emitsOnlyAllowedOperators(args)
  );
}

export function hasConditions(group: RuleGroupTypeAny): boolean {
  return group.rules.some((rule) => typeof rule !== 'string' && (!isRuleGroup(rule) || hasConditions(rule)));
}

export function parseAccessRule(rule: AgentAccessRule | undefined): RuleGroupType | null {
  if (!rule) {
    return createEmptyConditionsQuery();
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

      return {
        ...rule,
        value: String(rule.value),
        stored: { field: rule.field, operator: rule.operator, value: rule.value },
      };
    }),
  } as RuleGroupTypeAny;
}

export function toAccessRule(query: RuleGroupType, variables: EnhancedConditionVariable[]): AgentAccessRule | null {
  const dataTypes = new Map(variables.map((variable) => [variable.name, variable.dataType]));

  const logic = formatQuery(query, {
    format: 'jsonlogic',
    ruleProcessor: (rule, options) => {
      if (isUnchanged(rule)) {
        return customRuleProcessor({ ...rule, value: rule.stored.value }, { ...options, parseNumbers: false });
      }

      const dataType = dataTypes.get(rule.field);

      return customRuleProcessor(withBooleanValue(rule, dataType), { ...options, parseNumbers: dataType === 'number' });
    },
  });

  return logic && typeof logic === 'object' ? (logic as AgentAccessRule) : null;
}

type StoredCondition = { field: string; operator: string; value: string | number | boolean };

function isUnchanged(rule: RuleType): rule is RuleType & { stored: StoredCondition } {
  const stored = (rule as { stored?: StoredCondition }).stored;

  return (
    stored !== undefined &&
    stored.field === rule.field &&
    stored.operator === rule.operator &&
    String(stored.value) === rule.value
  );
}

function withBooleanValue(rule: RuleType, dataType: ConditionFieldDataType | undefined): RuleType {
  const mayBeBoolean = dataType === 'boolean' || (dataType === undefined && rule.field.startsWith('subscriber.data.'));
  const comparesOneValue = rule.operator === '=' || rule.operator === '!=';

  if (mayBeBoolean && comparesOneValue && (rule.value === 'true' || rule.value === 'false')) {
    return { ...rule, value: rule.value === 'true' };
  }

  return rule;
}
