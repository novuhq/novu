/**
 * Array-item conditions map to the JSONLogic `some`, `all` and `none` operators.
 * They evaluate a nested condition against every item of an array field, e.g. digest events:
 *
 *   { "some": [{ "var": "steps.digest-step.events" }, { "var": "payload.channels.email" }] }
 *   { "all": [{ "var": "steps.digest-step.events" }, { "==": [{ "var": "payload.status" }, "read"] }] }
 *
 * The nested `var` is resolved relative to each array item, not to the root data.
 * The rule value is stored in the query builder as a JSON string of `ArrayItemCondition`.
 */

export const ARRAY_ITEM_OPERATORS = ['some', 'all', 'none'] as const;
export type ArrayItemOperator = (typeof ARRAY_ITEM_OPERATORS)[number];

export const ARRAY_ITEM_EXISTS_OPERATOR = 'exists';

export const ARRAY_ITEM_COMPARISON_OPERATORS = [
  { name: ARRAY_ITEM_EXISTS_OPERATOR, label: 'has value', jsonLogic: null },
  { name: '=', label: 'equals', jsonLogic: '==' },
  { name: '!=', label: 'does not equal', jsonLogic: '!=' },
  { name: '<', label: 'less than', jsonLogic: '<' },
  { name: '<=', label: 'less than or equal to', jsonLogic: '<=' },
  { name: '>', label: 'greater than', jsonLogic: '>' },
  { name: '>=', label: 'greater than or equal to', jsonLogic: '>=' },
] as const;

export type ArrayItemComparisonOperator = (typeof ARRAY_ITEM_COMPARISON_OPERATORS)[number]['name'];

export type JsonLogicNode = string | number | boolean | null | JsonLogicNode[] | { [key: string]: JsonLogicNode };

export type ArrayItemCondition = {
  path: string;
  operator: ArrayItemComparisonOperator;
  value: string;
};

const JSON_LOGIC_TO_COMPARISON_OPERATOR: Record<string, ArrayItemComparisonOperator> = {
  '==': '=',
  '===': '=',
  '!=': '!=',
  '!==': '!=',
  '<': '<',
  '<=': '<=',
  '>': '>',
  '>=': '>=',
};

export const EMPTY_ARRAY_ITEM_CONDITION: ArrayItemCondition = {
  path: '',
  operator: ARRAY_ITEM_EXISTS_OPERATOR,
  value: '',
};

export function isArrayItemOperator(operator: string): operator is ArrayItemOperator {
  return ARRAY_ITEM_OPERATORS.some((candidate) => candidate === operator);
}

function isComparisonOperator(operator: string | undefined): operator is ArrayItemComparisonOperator {
  return ARRAY_ITEM_COMPARISON_OPERATORS.some((candidate) => candidate.name === operator);
}

function isVarReference(value: JsonLogicNode | undefined): value is { var: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'var' in value &&
    typeof (value as { var: unknown }).var === 'string'
  );
}

function isPrimitive(value: JsonLogicNode | undefined): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export function parseArrayItemConditionValue(value: string | null | undefined): ArrayItemCondition {
  if (typeof value !== 'string' || !value) {
    return { ...EMPTY_ARRAY_ITEM_CONDITION };
  }

  try {
    const parsed: Partial<Record<keyof ArrayItemCondition, JsonLogicNode>> | null = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || typeof parsed.path !== 'string') {
      return { ...EMPTY_ARRAY_ITEM_CONDITION };
    }

    return {
      path: parsed.path,
      operator:
        typeof parsed.operator === 'string' && isComparisonOperator(parsed.operator)
          ? parsed.operator
          : ARRAY_ITEM_EXISTS_OPERATOR,
      value: isPrimitive(parsed.value) ? String(parsed.value) : '',
    };
  } catch {
    return { ...EMPTY_ARRAY_ITEM_CONDITION };
  }
}

export function serializeArrayItemConditionValue(condition: ArrayItemCondition): string {
  return JSON.stringify(condition);
}

export function getArrayItemConditionIssue(value: string | null): string | null {
  const condition = parseArrayItemConditionValue(value);

  if (!condition.path.trim()) {
    return 'Item property is required';
  }

  if (condition.operator !== ARRAY_ITEM_EXISTS_OPERATOR && !condition.value.trim()) {
    return 'Value is required';
  }

  return null;
}

export function formatArrayItemConditionJsonLogic(
  operator: ArrayItemOperator,
  field: string,
  condition: ArrayItemCondition
) {
  const itemVar = { var: condition.path.trim() };
  const comparison = ARRAY_ITEM_COMPARISON_OPERATORS.find((candidate) => candidate.name === condition.operator);
  const itemLogic = comparison?.jsonLogic ? { [comparison.jsonLogic]: [itemVar, condition.value] } : itemVar;

  return {
    [operator]: [{ var: field }, itemLogic],
  };
}

export function parseArrayItemConditionJsonLogic(val: JsonLogicNode, operator: ArrayItemOperator) {
  if (!Array.isArray(val) || val.length !== 2) {
    return false;
  }

  const [arrayOperand, itemLogic] = val;

  if (!isVarReference(arrayOperand)) {
    return false;
  }

  let condition: ArrayItemCondition | null = null;

  if (isVarReference(itemLogic)) {
    condition = { path: itemLogic.var, operator: ARRAY_ITEM_EXISTS_OPERATOR, value: '' };
  } else if (itemLogic && typeof itemLogic === 'object' && !Array.isArray(itemLogic)) {
    const entries = Object.entries(itemLogic);

    if (entries.length === 1) {
      const [jsonLogicOperator, operands] = entries[0];
      const comparisonOperator = JSON_LOGIC_TO_COMPARISON_OPERATOR[jsonLogicOperator];

      if (
        comparisonOperator &&
        Array.isArray(operands) &&
        operands.length === 2 &&
        isVarReference(operands[0]) &&
        isPrimitive(operands[1])
      ) {
        condition = { path: operands[0].var, operator: comparisonOperator, value: String(operands[1]) };
      }
    }
  }

  if (!condition) {
    return false;
  }

  return {
    field: arrayOperand.var,
    operator,
    value: serializeArrayItemConditionValue(condition),
  };
}
