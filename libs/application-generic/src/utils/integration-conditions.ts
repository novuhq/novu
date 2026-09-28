import {
  INTEGRATION_CONDITION_NAMESPACES,
  INTEGRATION_CONDITION_RUNTIME_NAMESPACES,
  INTEGRATION_CONDITION_VARIABLES,
} from '@novu/shared';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import {
  COMPARISON_OPERATORS,
  evaluateRules,
  isValidRule,
  LOGICAL_OPERATORS,
  QueryValidatorService,
  UNARY_STRING_OPERATORS,
} from '../services/query-parser';
import type { WorkflowVariables } from './build-workflow-variables';

export interface IntegrationRuleEvaluationData {
  payload?: unknown;
  subscriber?: unknown;
  context?: unknown;
  workflow?: WorkflowVariables;
}

export interface IntegrationRuleEvaluationResult {
  result: boolean;
  issues: string[];
}

export { INTEGRATION_CONDITION_NAMESPACES, INTEGRATION_CONDITION_RUNTIME_NAMESPACES, INTEGRATION_CONDITION_VARIABLES };

type IntegrationConditionNamespace =
  | (typeof INTEGRATION_CONDITION_NAMESPACES)[number]
  | (typeof INTEGRATION_CONDITION_RUNTIME_NAMESPACES)[number];

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

function collectDisallowedOperatorIssues(
  node: unknown,
  issues: string[],
  namespaces: readonly IntegrationConditionNamespace[]
): void {
  if (node === null || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectDisallowedOperatorIssues(item, issues, namespaces);
    }

    return;
  }

  const entries = Object.entries(node);

  /*
   * json-logic only recognises single-key objects as operations, so a node with any
   * other number of keys is never a valid rule. Descending into just its values would
   * let an operator or `var` slip past this walk without ever being checked.
   */
  if (entries.length !== 1) {
    issues.push(`Invalid rule node with ${entries.length} keys, expected a single operator`);

    return;
  }

  const [operator, value] = entries[0];

  if (!INTEGRATION_RULE_OPERATORS.has(operator)) {
    issues.push(`Unsupported operator "${operator}"`);

    return;
  }

  if (operator === 'var') {
    const fieldValue = typeof value === 'string' ? value : '';

    if (!isAllowedIntegrationVar(fieldValue, namespaces)) {
      issues.push('Value is not valid');
    }

    return;
  }

  collectDisallowedOperatorIssues(value, issues, namespaces);
}

function isAllowedIntegrationVar(fieldValue: string, namespaces: readonly IntegrationConditionNamespace[]): boolean {
  if (!fieldValue) {
    return false;
  }

  if (fieldValue === 'subscriber.data') {
    return true;
  }

  const isWithinAllowedPrefixes = namespaces.some(
    (prefix) => fieldValue.startsWith(prefix) && fieldValue.length > prefix.length
  );

  return isWithinAllowedPrefixes || (INTEGRATION_CONDITION_VARIABLES as readonly string[]).includes(fieldValue);
}

export function getIntegrationRulesIssues(
  logic: Record<string, unknown>,
  namespaces: readonly IntegrationConditionNamespace[] = INTEGRATION_CONDITION_NAMESPACES
): string[] {
  if (!isValidRule(logic as RulesLogic<AdditionalOperation>)) {
    return ['Invalid integration conditions'];
  }

  const disallowedOperatorIssues: string[] = [];
  collectDisallowedOperatorIssues(logic, disallowedOperatorIssues, namespaces);

  const queryValidatorService = new QueryValidatorService([...INTEGRATION_CONDITION_VARIABLES], [...namespaces]);

  const fieldAndStructureIssues = queryValidatorService
    .validateQueryRules(logic as RulesLogic<AdditionalOperation>)
    .map((issue) => issue.message);

  return [...disallowedOperatorIssues, ...fieldAndStructureIssues];
}

export function evaluateIntegrationRules(
  rules: Record<string, unknown>,
  data: IntegrationRuleEvaluationData
): IntegrationRuleEvaluationResult {
  const issues = getIntegrationRulesIssues(rules, INTEGRATION_CONDITION_RUNTIME_NAMESPACES);
  if (issues.length > 0) {
    return { result: false, issues };
  }

  const { result } = evaluateRules(rules as RulesLogic<AdditionalOperation>, data, true);

  return { result, issues: [] };
}
