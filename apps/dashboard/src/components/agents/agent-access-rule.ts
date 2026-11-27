import {
  ACCESS_RULE_CHANNEL_PLATFORM_FIELD,
  ACCESS_RULE_SUBSCRIBER_FIELDS,
  AGENT_PLATFORMS,
  INTEGRATION_RULE_OPERATORS,
  isAccessRuleField,
} from '@novu/shared';
import { formatQuery, isRuleGroup, type RuleGroupType, type RuleGroupTypeAny, type RuleType } from 'react-querybuilder';
import { getConditionsSchema } from '@/components/conditions-editor/conditions-schema';
import { createEmptyConditionsQuery } from '@/components/conditions-editor/conditions-variables';
import { parseLosslessRule } from '@/components/conditions-editor/lossless-rule';
import type { ConditionFieldDataType, EnhancedConditionVariable } from '@/components/conditions-editor/types';
import { customRuleProcessor } from '@/utils/conditions';

export type AgentAccessRule = Record<string, unknown>;

export const ACCESS_RULE_VARIABLES: EnhancedConditionVariable[] = [
  ...ACCESS_RULE_SUBSCRIBER_FIELDS.map(
    (field): EnhancedConditionVariable => ({
      name: `subscriber.${field}`,
      dataType: field === 'data' ? 'object' : 'string',
    })
  ),
  {
    name: ACCESS_RULE_CHANNEL_PLATFORM_FIELD,
    displayLabel: 'channel.platform (Slack, WhatsApp…)',
    dataType: 'string',
    allowedValues: AGENT_PLATFORMS,
  },
];

const FIELD_ISSUE =
  'Access rules can only use subscriber.<field>, subscriber.data.<key>, context.<type>.id, context.<type>.data.<key> or channel.platform';
const OPERATOR_ISSUE = 'Access rules do not support this operator';
const DYNAMIC_VALUE_ISSUE = 'Dynamic values are not supported here';
const DYNAMIC_VALUE = /\{\{.*\}\}/;
const PLATFORM_VALUE_ISSUE = `Use one of: ${AGENT_PLATFORMS.join(', ')}`;
const OPERATORS_COMPARING_WHOLE_VALUES = new Set(['=', '!=', 'in', 'notIn']);

export function getAccessRuleFieldIssue(field: string): string | null {
  return isAccessRuleField(field) ? null : FIELD_ISSUE;
}

const ALLOWED_OPERATORS = new Set<string>(INTEGRATION_RULE_OPERATORS);

export function getAccessRuleConditionIssue(rule: RuleType): string | null {
  if (typeof rule.value === 'string' && DYNAMIC_VALUE.test(rule.value)) {
    return DYNAMIC_VALUE_ISSUE;
  }

  if (isUnknownPlatform(rule)) {
    return PLATFORM_VALUE_ISSUE;
  }

  const logic = customRuleProcessor(rule, { parseNumbers: false });

  return emitsOnlyAllowedOperators(logic) ? null : OPERATOR_ISSUE;
}

function isUnknownPlatform({ field, operator, value }: RuleType): boolean {
  if (field !== ACCESS_RULE_CHANNEL_PLATFORM_FIELD || !OPERATORS_COMPARING_WHOLE_VALUES.has(operator)) {
    return false;
  }

  return String(value)
    .split(',')
    .map((platform) => platform.trim())
    .some((platform) => platform !== '' && !(AGENT_PLATFORMS as readonly string[]).includes(platform));
}

function emitsOnlyAllowedOperators(node: unknown): boolean {
  if (Array.isArray(node)) return node.every(emitsOnlyAllowedOperators);
  if (node === null || typeof node !== 'object') return true;

  return Object.entries(node).every(
    ([operator, args]) => ALLOWED_OPERATORS.has(operator) && emitsOnlyAllowedOperators(args)
  );
}

export const accessRuleFormSchema = getConditionsSchema({
  getFieldIssue: getAccessRuleFieldIssue,
  getOperatorIssue: getAccessRuleConditionIssue,
}).refine(({ query }) => hasConditions(query as RuleGroupType), {
  message: 'Add at least one condition.',
  path: ['query'],
});

export function hasConditions(group: RuleGroupTypeAny): boolean {
  return group.rules.some((rule) => typeof rule !== 'string' && (!isRuleGroup(rule) || hasConditions(rule)));
}

export function parseAccessRule(rule: AgentAccessRule | undefined): RuleGroupType | null {
  if (!rule) {
    return createEmptyConditionsQuery();
  }

  return parseLosslessRule(rule, { prepare: withStoredValues, format: (query) => toAccessRule(query, []) });
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
