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

const SUBSCRIBER_FIELDS = ['subscriberId', 'firstName', 'lastName', 'email', 'phone', 'locale', 'avatar', 'timezone'];

export const ACCESS_RULE_SUBSCRIBER_VARIABLES: EnhancedConditionVariable[] = [
  ...SUBSCRIBER_FIELDS.map((field) => ({ name: `subscriber.${field}`, dataType: 'string' as const })),
  { name: 'subscriber.data', dataType: 'object' },
];

const FIELD_ISSUE =
  'Access rules can only use subscriber.<field>, subscriber.data.<key>, context.<type>.id or context.<type>.data.<key>';
const OPERATOR_ISSUE = 'Access rules do not support this operator';

export function getAccessRuleFieldIssue(field: string): string | null {
  const [namespace, key, ...path] = field.split('.');

  if (!key || [key, ...path].some((segment) => segment in Object.prototype)) {
    return FIELD_ISSUE;
  }

  if (namespace === 'subscriber') {
    return key === 'data' || (path.length === 0 && SUBSCRIBER_FIELDS.includes(key)) ? null : FIELD_ISSUE;
  }

  if (namespace === 'context') {
    return path[0] === 'data' || (path[0] === 'id' && path.length === 1) ? null : FIELD_ISSUE;
  }

  return FIELD_ISSUE;
}

export function getAccessRuleOperatorIssue(operator: string): string | null {
  return isRelativeDateOperator(operator) || isArrayItemOperator(operator) ? OPERATOR_ISSUE : null;
}

export function createEmptyAccessRuleQuery(): RuleGroupType {
  return { id: generateID(), combinator: 'and', rules: [] };
}

export function parseAccessRule(rule: AgentAccessRule | undefined): RuleGroupType {
  if (!rule) {
    return createEmptyAccessRuleQuery();
  }

  const query = parseJsonLogic(rule as RQBJsonLogic, { generateIDs: true, ...parseJsonLogicOptions });

  return stringifyValues(query) as RuleGroupType;
}

function stringifyValues(group: RuleGroupTypeAny): RuleGroupTypeAny {
  return {
    ...group,
    rules: group.rules.map((rule) => {
      if (typeof rule === 'string') return rule;
      if (isRuleGroup(rule)) return stringifyValues(rule);

      return typeof rule.value === 'number' || typeof rule.value === 'boolean'
        ? { ...rule, value: String(rule.value) }
        : rule;
    }),
  } as RuleGroupTypeAny;
}

export function toAccessRule(query: RuleGroupType, variables: EnhancedConditionVariable[]): AgentAccessRule | null {
  const dataTypes = new Map(variables.map((variable) => [variable.name, variable.dataType]));

  const logic = formatQuery(query, {
    format: 'jsonlogic',
    ruleProcessor: (rule, options) => {
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
