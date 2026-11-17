import {
  evaluateRules,
  extractFieldsFromRules,
  getIntegrationRulesIssues,
  hasIntegrationRules,
  INTEGRATION_CONDITION_NAMESPACES,
} from '@novu/application-generic';
import type { SubscriberEntity } from '@novu/dal';
import type { AgentContextPayload, AgentContextValue } from '@novu/framework';
import jsonLogic, { AdditionalOperation, RulesLogic } from 'json-logic-js';

export type AgentAccessRuleVerdict =
  | { outcome: 'allowed' }
  | { outcome: 'denied' }
  | { outcome: 'error'; reason: string };

export function getAgentAccessRuleIssues(rule: unknown): string[] {
  if (!hasIntegrationRules(rule)) {
    return ['Access rule must be a non-empty JSON Logic object'];
  }

  const issues = getIntegrationRulesIssues(rule, INTEGRATION_CONDITION_NAMESPACES);

  for (const field of extractFieldsFromRules(rule as RulesLogic<AdditionalOperation>)) {
    if (!isAccessRuleField(field)) {
      issues.push(`Variable "${field}" is not allowed`);
    }
  }

  return issues;
}

const ACCESS_RULE_SUBSCRIBER_FIELDS = [
  'subscriberId',
  'firstName',
  'lastName',
  'email',
  'phone',
  'locale',
  'avatar',
  'timezone',
  'data',
] as const satisfies readonly (keyof SubscriberEntity)[];

function isAccessRuleField(field: string): boolean {
  const [namespace, key, ...path] = field.split('.');

  if (!key || [key, ...path].some((segment) => segment in Object.prototype)) {
    return false;
  }

  if (namespace === 'subscriber') {
    return key === 'data' || (path.length === 0 && (ACCESS_RULE_SUBSCRIBER_FIELDS as readonly string[]).includes(key));
  }

  if (namespace === 'context') {
    return path[0] === 'data' || (path[0] === 'id' && path.length === 1);
  }

  return false;
}

export function evaluateAgentAccessRule(
  rule: unknown,
  data: { subscriber: SubscriberEntity; context: AgentContextPayload | null | undefined }
): AgentAccessRuleVerdict {
  const issues = getAgentAccessRuleIssues(rule);
  if (issues.length > 0) {
    return { outcome: 'error', reason: issues.join('; ') };
  }

  const { result, error } = evaluateRules(rule as RulesLogic<AdditionalOperation>, projectEvaluationData(data), true);
  if (error) {
    return { outcome: 'error', reason: String(error) };
  }

  // json-logic treats [] as falsy; JS does not.
  if (jsonLogic.truthy(result)) {
    return { outcome: 'allowed' };
  }

  return { outcome: 'denied' };
}

type AccessRuleSubscriber = Pick<SubscriberEntity, (typeof ACCESS_RULE_SUBSCRIBER_FIELDS)[number]>;

type AccessRuleContextValue = { id: string; data?: Record<string, unknown> };

function projectEvaluationData(data: {
  subscriber: SubscriberEntity;
  context: AgentContextPayload | null | undefined;
}): { subscriber: AccessRuleSubscriber; context: Record<string, AccessRuleContextValue> } {
  return {
    subscriber: Object.fromEntries(
      ACCESS_RULE_SUBSCRIBER_FIELDS.map((field) => [field, data.subscriber[field]])
    ) as AccessRuleSubscriber,
    context: Object.fromEntries(
      Object.entries(data.context ?? {}).map(([type, value]) => [type, toAccessRuleContextValue(value)])
    ),
  };
}

function toAccessRuleContextValue(value: AgentContextValue): AccessRuleContextValue {
  if (typeof value === 'string') {
    return { id: value };
  }

  return { id: value.id, data: value.data };
}
