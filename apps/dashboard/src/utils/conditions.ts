import { defaultRuleProcessorJsonLogic, RQBJsonLogic, RuleGroupType, RuleType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import {
  formatArrayItemConditionJsonLogic,
  isArrayItemOperator,
  type JsonLogicNode,
  parseArrayItemConditionJsonLogic,
  parseArrayItemConditionValue,
} from '@/components/conditions-editor/array-item-condition';
import { isRelativeDateOperator, isUnaryJsonLogicOperator } from '@/components/conditions-editor/field-type-operators';

function isJsonLogicObject(node: JsonLogicNode | undefined): node is { [key: string]: JsonLogicNode } {
  return !!node && typeof node === 'object' && !Array.isArray(node);
}

function getVarName(node: JsonLogicNode | undefined): string | undefined {
  return isJsonLogicObject(node) && typeof node.var === 'string' ? node.var : undefined;
}

function parseArrayOperatorArgs(val: JsonLogicNode, operator: string) {
  if (!Array.isArray(val) || val.length < 2) {
    return false;
  }

  const field = getVarName(val[0]);

  if (!field) {
    return false;
  }

  const secondOperand = val[1];
  let values: string;

  if (isJsonLogicObject(secondOperand) && 'var' in secondOperand) {
    values = `{{${secondOperand.var}}}`;
  } else if (Array.isArray(secondOperand)) {
    values = secondOperand.join(', ');
  } else {
    values = String(secondOperand);
  }

  return {
    field,
    operator,
    value: values,
  };
}

function parseRelativeDateArgs(val: JsonLogicNode, operator: string) {
  if (!Array.isArray(val) || val.length < 2) {
    return false;
  }

  const field = getVarName(val[0]);

  if (!field) {
    return false;
  }

  return {
    field,
    operator,
    value: JSON.stringify(val[1]),
  };
}

function parseUnaryOperatorArgs(val: JsonLogicNode, operator: string) {
  if (!Array.isArray(val) || val.length !== 1) {
    return false;
  }

  const field = getVarName(val[0]);

  if (!field) {
    return false;
  }

  return {
    field,
    operator,
    value: '',
  };
}

const customJsonLogicOperations = {
  moreThanXAgo: (val: JsonLogicNode) => parseRelativeDateArgs(val, 'moreThanXAgo'),
  lessThanXAgo: (val: JsonLogicNode) => parseRelativeDateArgs(val, 'lessThanXAgo'),
  exactlyXAgo: (val: JsonLogicNode) => parseRelativeDateArgs(val, 'exactlyXAgo'),
  withinLast: (val: JsonLogicNode) => parseRelativeDateArgs(val, 'withinLast'),
  notWithinLast: (val: JsonLogicNode) => parseRelativeDateArgs(val, 'notWithinLast'),
  containsAny: (val: JsonLogicNode) => parseArrayOperatorArgs(val, 'containsAny'),
  doesNotContainAny: (val: JsonLogicNode) => parseArrayOperatorArgs(val, 'doesNotContainAny'),
  isEmpty: (val: JsonLogicNode) => parseUnaryOperatorArgs(val, 'isEmpty'),
  isNonEmpty: (val: JsonLogicNode) => parseUnaryOperatorArgs(val, 'isNonEmpty'),
  some: (val: JsonLogicNode) => parseArrayItemConditionJsonLogic(val, 'some'),
  all: (val: JsonLogicNode) => parseArrayItemConditionJsonLogic(val, 'all'),
  none: (val: JsonLogicNode) => parseArrayItemConditionJsonLogic(val, 'none'),
};

// Shared parse options for consistency
const parseJsonLogicOptions = {
  jsonLogicOperations: customJsonLogicOperations,
};

function countRules(query: RuleGroupType): number {
  let count = 0;

  for (const rule of query.rules) {
    if ('rules' in rule) {
      count += countRules(rule);
    } else {
      count += 1;
    }
  }

  return count;
}

export const countConditions = (jsonLogic?: RQBJsonLogic) => {
  if (!jsonLogic) return 0;

  const query = parseJsonLogic(jsonLogic, parseJsonLogicOptions);

  return countRules(query);
};

function recursiveGetUniqueFields(query: RuleGroupType): string[] {
  const fields = new Set<string>();

  for (const rule of query.rules) {
    if ('rules' in rule) {
      // recursively get fields from nested rule groups
      const nestedFields = recursiveGetUniqueFields(rule);
      for (const field of nestedFields) {
        fields.add(field);
      }
    } else {
      // add field from individual rule
      const field = rule.field.split('.').shift();

      if (field) {
        fields.add(field);
      }
    }
  }

  return Array.from(fields);
}

export const getUniqueFieldNamespaces = (jsonLogic?: RQBJsonLogic): string[] => {
  if (!jsonLogic) return [];

  const query = parseJsonLogic(jsonLogic, parseJsonLogicOptions);

  return recursiveGetUniqueFields(query);
};

function recursiveGetUniqueOperators(query: RuleGroupType): string[] {
  const operators = new Set<string>();

  for (const rule of query.rules) {
    if ('rules' in rule) {
      // recursively get operators from nested rule groups
      const nestedOperators = recursiveGetUniqueOperators(rule);
      for (const operator of nestedOperators) {
        operators.add(operator);
      }
    } else {
      // add operator from individual rule
      operators.add(rule.operator);
    }
  }

  return Array.from(operators);
}

export const getUniqueOperators = (jsonLogic?: RQBJsonLogic): string[] => {
  if (!jsonLogic) return [];

  const query = parseJsonLogic(jsonLogic, parseJsonLogicOptions);

  return recursiveGetUniqueOperators(query);
};

const CONTAINS_ANY_OPERATORS = ['containsAny', 'doesNotContainAny'] as const;

function isContainsAnyOperator(operator: string): boolean {
  return (CONTAINS_ANY_OPERATORS as readonly string[]).includes(operator);
}

export const customRuleProcessor = (rule: RuleType, options: Parameters<typeof defaultRuleProcessorJsonLogic>[1]) => {
  if (isUnaryJsonLogicOperator(rule.operator)) {
    return {
      [rule.operator]: [{ var: rule.field }],
    };
  }

  if (isArrayItemOperator(rule.operator)) {
    return formatArrayItemConditionJsonLogic(rule.operator, rule.field, parseArrayItemConditionValue(rule.value));
  }

  if (isRelativeDateOperator(rule.operator)) {
    try {
      const parsedValue = JSON.parse(rule.value as string);

      if (
        parsedValue &&
        (typeof parsedValue.amount === 'number' || typeof parsedValue.amount === 'string') &&
        parsedValue.unit
      ) {
        return {
          [rule.operator]: [{ var: rule.field }, parsedValue],
        };
      }
    } catch {
      // Fall through to the default processor when the relative-date payload is invalid.
    }
  }

  if (isContainsAnyOperator(rule.operator)) {
    const trimmedValue = (rule.value as string).trim();
    const variableMatch = trimmedValue.match(/^\{\{(.+?)\}\}$/);

    if (variableMatch) {
      return {
        [rule.operator]: [{ var: rule.field }, { var: variableMatch[1].trim() }],
      };
    }

    const values = trimmedValue
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    return {
      [rule.operator]: [{ var: rule.field }, values],
    };
  }

  return defaultRuleProcessorJsonLogic(rule, options);
};

export { parseJsonLogicOptions };
