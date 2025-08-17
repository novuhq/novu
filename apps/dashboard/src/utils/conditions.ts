import { RQBJsonLogic, RuleGroupType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';

// Custom JsonLogic operations for parsing relative date operators
const customJsonLogicOperations = {
  moreThanXAgo: (val: any) => {
    if (!val || !Array.isArray(val) || val.length < 2) {
      return false;
    }

    return {
      field: val[0]?.var,
      operator: 'moreThanXAgo',
      value: JSON.stringify(val[1]),
    };
  },
  lessThanXAgo: (val: any) => {
    if (!val || !Array.isArray(val) || val.length < 2) {
      return false;
    }

    return {
      field: val[0]?.var,
      operator: 'lessThanXAgo',
      value: JSON.stringify(val[1]),
    };
  },
  exactlyXAgo: (val: any) => {
    if (!val || !Array.isArray(val) || val.length < 2) {
      return false;
    }

    return {
      field: val[0]?.var,
      operator: 'exactlyXAgo',
      value: JSON.stringify(val[1]),
    };
  },
  withinLast: (val: any) => {
    if (!val || !Array.isArray(val) || val.length < 2) {
      return false;
    }

    return {
      field: val[0]?.var,
      operator: 'withinLast',
      value: JSON.stringify(val[1]),
    };
  },
  notWithinLast: (val: any) => {
    if (!val || !Array.isArray(val) || val.length < 2) {
      return false;
    }

    return {
      field: val[0]?.var,
      operator: 'notWithinLast',
      value: JSON.stringify(val[1]),
    };
  },
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

  const query = parseJsonLogic(jsonLogic, parseJsonLogicOptions);

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

  const query = parseJsonLogic(jsonLogic, parseJsonLogicOptions);

  return recursiveGetUniqueOperators(query);
};

// Export shared configuration for use in other files
export { customJsonLogicOperations, parseJsonLogicOptions };
