import {
  ACCESS_RULE_CHANNEL_PLATFORM_FIELD,
  ACCESS_RULE_SUBSCRIBER_FIELDS,
  AGENT_PLATFORMS,
  INTEGRATION_RULE_OPERATORS,
  isAccessRuleField,
} from '@novu/shared';
import {
  formatQuery,
  generateID,
  isRuleGroup,
  type RuleGroupType,
  type RuleGroupTypeAny,
  type RuleType,
} from 'react-querybuilder';
import { z } from 'zod';
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
})
  .extend({ polarity: z.enum(['allow', 'deny']) })
  .refine(({ query }) => hasConditions(query as RuleGroupType), {
    message: 'Add at least one condition.',
    path: ['query'],
  });

export function hasConditions(group: RuleGroupTypeAny): boolean {
  return group.rules.some((rule) => typeof rule !== 'string' && (!isRuleGroup(rule) || hasConditions(rule)));
}

/** Reply to subscribers who match the conditions (`allow`), or to everyone but them (`deny`, stored as `{ "!": conditions }`). */
export type AccessRulePolarity = 'allow' | 'deny';

export type AccessRuleDraft = { polarity: AccessRulePolarity; query: RuleGroupType };

export function parseAccessRule(rule: AgentAccessRule | undefined): AccessRuleDraft | null {
  if (!rule) {
    return { polarity: 'allow', query: createEmptyConditionsQuery() };
  }

  const negated = getNegatedConditions(rule);
  const query = parseLosslessRule(negated ?? rule, {
    prepare: withStoredValues,
    format: (conditions) => formatConditions(conditions, []),
  });

  return query && { polarity: negated ? 'deny' : 'allow', query };
}

export const ACCESS_RULE_POLARITIES: Record<AccessRulePolarity, { label: string; outcome: string }> = {
  allow: {
    label: 'Reply to',
    outcome: "Everyone else gets a short refusal. People who aren't subscribers yet are always refused.",
  },
  deny: {
    label: "Don't reply to",
    outcome:
      "Everyone else who is a known subscriber gets a reply. People who aren't subscribers yet are always refused.",
  },
};

type StartingPoint = {
  label: string;
  polarity: AccessRulePolarity;
  condition: { field: string; operator: string; value: string };
};

/** One condition each, which the user then completes. Shown while the rule has no conditions. */
export const ACCESS_RULE_STARTING_POINTS: StartingPoint[] = [
  {
    label: 'Paid plans only',
    polarity: 'allow',
    condition: { field: 'context.tenant.data.plan', operator: 'in', value: '' },
  },
  { label: 'Staff only', polarity: 'allow', condition: { field: 'subscriber.email', operator: 'endsWith', value: '' } },
  {
    label: 'Beta users',
    polarity: 'allow',
    condition: { field: 'subscriber.data.betaAccess', operator: '=', value: 'true' },
  },
  { label: 'Specific people', polarity: 'deny', condition: { field: 'subscriber.email', operator: 'in', value: '' } },
];

export function startFrom({ polarity, condition }: StartingPoint): AccessRuleDraft {
  return { polarity, query: { ...createEmptyConditionsQuery(), rules: [{ id: generateID(), ...condition }] } };
}

function getNegatedConditions(rule: AgentAccessRule): AgentAccessRule | null {
  const [operator, ...others] = Object.keys(rule);
  const conditions = rule['!'];

  if (operator !== '!' || others.length > 0) return null;

  return conditions !== null && typeof conditions === 'object' && !Array.isArray(conditions)
    ? (conditions as AgentAccessRule)
    : null;
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

export function toAccessRule(
  { polarity, query }: AccessRuleDraft,
  variables: EnhancedConditionVariable[]
): AgentAccessRule | null {
  const conditions = formatConditions(query, variables);

  return conditions && polarity === 'deny' ? { '!': conditions } : conditions;
}

function formatConditions(query: RuleGroupType, variables: EnhancedConditionVariable[]): AgentAccessRule | null {
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
