import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import {
  COMPARISON_OPERATORS,
  isValidRule,
  LOGICAL_OPERATORS,
  QueryValidatorService,
  UNARY_STRING_OPERATORS,
} from '../services/query-parser';

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

/**
 * Operators the conditions editor and QueryValidatorService actually inspect.
 * Native json-logic ops outside this set (`log`, `map`, `reduce`, `if`, `+`, …)
 * must not be persisted or applied — jsonLogic.apply would still execute them.
 */
const INTEGRATION_RULE_OPERATORS = new Set<string>([
  ...LOGICAL_OPERATORS,
  ...COMPARISON_OPERATORS,
  ...UNARY_STRING_OPERATORS,
  'var',
  'contains',
  'doesNotContain',
  'doesNotBeginWith',
  'doesNotEndWith',
  'containsAny',
  'doesNotContainAny',
  'null',
  'notNull',
  'notIn',
]);

export function hasIntegrationRules(rules?: unknown): rules is Record<string, unknown> {
  return !!rules && typeof rules === 'object' && !Array.isArray(rules) && Object.keys(rules).length > 0;
}

export function hasLegacyIntegrationConditions(conditions?: unknown[] | null): boolean {
  return Array.isArray(conditions) && conditions.length > 0;
}

function collectDisallowedOperatorIssues(node: unknown, issues: string[]): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectDisallowedOperatorIssues(item, issues);
    }

    return;
  }

  const entries = Object.entries(node);

  if (entries.length !== 1) {
    for (const [, value] of entries) {
      collectDisallowedOperatorIssues(value, issues);
    }

    return;
  }

  const [operator, value] = entries[0];

  if (!INTEGRATION_RULE_OPERATORS.has(operator)) {
    issues.push(`Unsupported operator "${operator}"`);

    return;
  }

  if (operator === 'var') {
    const fieldValue = typeof value === 'string' ? value : '';

    if (!isAllowedIntegrationVar(fieldValue)) {
      issues.push('Value is not valid');
    }

    return;
  }

  collectDisallowedOperatorIssues(value, issues);
}

function isAllowedIntegrationVar(fieldValue: string): boolean {
  if (!fieldValue) {
    return false;
  }

  if (fieldValue === 'subscriber.data') {
    return true;
  }

  const isWithinAllowedPrefixes = INTEGRATION_CONDITION_NAMESPACES.some(
    (prefix) => fieldValue.startsWith(prefix) && fieldValue.length > prefix.length
  );

  return isWithinAllowedPrefixes || INTEGRATION_CONDITION_VARIABLES.includes(fieldValue);
}

export function getIntegrationRulesIssues(logic: Record<string, unknown>): string[] {
  if (!isValidRule(logic as RulesLogic<AdditionalOperation>)) {
    return ['Invalid integration conditions'];
  }

  const disallowedOperatorIssues: string[] = [];
  collectDisallowedOperatorIssues(logic, disallowedOperatorIssues);

  const queryValidatorService = new QueryValidatorService(
    INTEGRATION_CONDITION_VARIABLES,
    INTEGRATION_CONDITION_NAMESPACES
  );

  const fieldAndStructureIssues = queryValidatorService
    .validateQueryRules(logic as RulesLogic<AdditionalOperation>)
    .map((issue) => issue.message);

  return [...disallowedOperatorIssues, ...fieldAndStructureIssues];
}
