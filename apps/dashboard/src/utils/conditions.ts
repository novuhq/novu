import { RuleGroupType, RQBJsonLogic } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';

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

  const query = parseJsonLogic(jsonLogic);

  return countRules(query);
};

function recursiveGetUniqueFields(query: RuleGroupType): string[] {
  const fields = new Set<string>();

  for (const rule of query.rules) {
    if ('rules' in rule) {
      // recursively get fields from nested rule groups
      const nestedFields = recursiveGetUniqueFields(rule);
      nestedFields.forEach((field) => fields.add(field));
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

  const query = parseJsonLogic(jsonLogic);

  return recursiveGetUniqueFields(query);
};

function recursiveGetUniqueOperators(query: RuleGroupType): string[] {
  const operators = new Set<string>();

  for (const rule of query.rules) {
    if ('rules' in rule) {
      // recursively get operators from nested rule groups
      const nestedOperators = recursiveGetUniqueOperators(rule);
      nestedOperators.forEach((operator) => operators.add(operator));
    } else {
      // add operator from individual rule
      operators.add(rule.operator);
    }
  }

  return Array.from(operators);
}

export const getUniqueOperators = (jsonLogic?: RQBJsonLogic): string[] => {
  if (!jsonLogic) return [];

  const query = parseJsonLogic(jsonLogic);

  return recursiveGetUniqueOperators(query);
};
