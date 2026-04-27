import { DomainRouteMatch, ROUTE_MATCH_CONTEXT_PATHS } from '@novu/shared';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import jsonLogic from 'json-logic-js';

const MAX_JSON_LOGIC_RULE_BYTES = 4096;
const MAX_JSON_LOGIC_RULE_DEPTH = 8;
const ALLOWED_DYNAMIC_PREFIXES = ['domain.data.', 'route.data.', 'mail.headers.'];
const SUPPORTED_JSON_LOGIC_OPERATORS = new Set([
  '!',
  '!=',
  '<',
  '<=',
  '=',
  '==',
  '>',
  '>=',
  'and',
  'between',
  'contains',
  'containsAny',
  'doesNotBeginWith',
  'doesNotContain',
  'doesNotContainAny',
  'doesNotEndWith',
  'endsWith',
  'exactlyXAgo',
  'in',
  'lessThanXAgo',
  'moreThanXAgo',
  'notBetween',
  'notIn',
  'notNull',
  'notWithinLast',
  'null',
  'or',
  'startsWith',
  'var',
  'withinLast',
]);

function getSerializedSize(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function getDepth(value: unknown): number {
  if (value === null || typeof value !== 'object') {
    return 0;
  }

  if (Array.isArray(value)) {
    return 1 + Math.max(0, ...value.map(getDepth));
  }

  return 1 + Math.max(0, ...Object.values(value as Record<string, unknown>).map(getDepth));
}

function isAllowedRouteMatchPath(path: string): boolean {
  return (
    (ROUTE_MATCH_CONTEXT_PATHS as readonly string[]).includes(path) ||
    ALLOWED_DYNAMIC_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

function extractVariables(rule: unknown, variables = new Set<string>()): Set<string> {
  if (rule === null || typeof rule !== 'object') {
    return variables;
  }

  if (Array.isArray(rule)) {
    for (const item of rule) {
      extractVariables(item, variables);
    }

    return variables;
  }

  for (const [operator, value] of Object.entries(rule as Record<string, unknown>)) {
    if (operator === 'var') {
      if (typeof value === 'string') {
        variables.add(value);
      } else if (Array.isArray(value) && typeof value[0] === 'string') {
        variables.add(value[0]);
      }
    }

    extractVariables(value, variables);
  }

  return variables;
}

function extractOperators(rule: unknown, operators = new Set<string>()): Set<string> {
  if (rule === null || typeof rule !== 'object') {
    return operators;
  }

  if (Array.isArray(rule)) {
    for (const item of rule) {
      extractOperators(item, operators);
    }

    return operators;
  }

  if (jsonLogic.is_logic(rule)) {
    for (const [operator, value] of Object.entries(rule as Record<string, unknown>)) {
      operators.add(operator);
      extractOperators(value, operators);
    }

    return operators;
  }

  for (const value of Object.values(rule as Record<string, unknown>)) {
    extractOperators(value, operators);
  }

  return operators;
}

export function isJsonLogicRouteMatchRule(value: unknown): value is DomainRouteMatch {
  if (value === undefined || value === null) {
    return true;
  }

  if (!jsonLogic.is_logic(value)) {
    return false;
  }

  if (getSerializedSize(value) > MAX_JSON_LOGIC_RULE_BYTES) {
    return false;
  }

  if (getDepth(value) > MAX_JSON_LOGIC_RULE_DEPTH) {
    return false;
  }

  const variables = extractVariables(value);
  const operators = extractOperators(value);

  return (
    Array.from(variables).every(isAllowedRouteMatchPath) &&
    Array.from(operators).every((operator) => SUPPORTED_JSON_LOGIC_OPERATORS.has(operator))
  );
}

@ValidatorConstraint({ name: 'isJsonLogicRule', async: false })
class IsJsonLogicRuleConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isJsonLogicRouteMatchRule(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a JSON Logic rule under ${MAX_JSON_LOGIC_RULE_BYTES} bytes, at most ${MAX_JSON_LOGIC_RULE_DEPTH} levels deep, and may only reference route match context fields.`;
  }
}

export function IsJsonLogicRule(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsJsonLogicRuleConstraint,
    });
  };
}
