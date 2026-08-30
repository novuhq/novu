import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import { isValidRule, QueryValidatorService } from '../services/query-parser';

export const INTEGRATION_CONDITION_NAMESPACES = ['tenant.', 'context.', 'subscriber.'];

export const INTEGRATION_CONDITION_VARIABLES = [
  'tenant.identifier',
  'tenant.name',
  'tenant.data',
  'context.tenant.id',
  'subscriber.subscriberId',
  'subscriber.email',
  'subscriber.phone',
  'subscriber.firstName',
  'subscriber.lastName',
  'subscriber.locale',
  'subscriber.data',
];

export function hasIntegrationRules(rules?: unknown): rules is Record<string, unknown> {
  return !!rules && typeof rules === 'object' && !Array.isArray(rules) && Object.keys(rules).length > 0;
}

export function hasLegacyIntegrationConditions(conditions?: unknown[] | null): boolean {
  return Array.isArray(conditions) && conditions.length > 0;
}

export function getIntegrationRulesIssues(logic: Record<string, unknown>): string[] {
  if (!isValidRule(logic as RulesLogic<AdditionalOperation>)) {
    return ['Invalid integration conditions'];
  }

  const queryValidatorService = new QueryValidatorService(
    INTEGRATION_CONDITION_VARIABLES,
    INTEGRATION_CONDITION_NAMESPACES
  );

  return queryValidatorService
    .validateQueryRules(logic as RulesLogic<AdditionalOperation>)
    .map((issue) => issue.message);
}
