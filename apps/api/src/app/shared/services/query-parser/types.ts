export enum JsonComparisonOperatorEnum {
  EQUAL = '==',
  NOT_EQUAL = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  IN = 'in',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

export enum JsonLogicOperatorEnum {
  NOT = '!',
  AND = 'and',
  OR = 'or',
}

export const COMPARISON_OPERATORS = [
  JsonComparisonOperatorEnum.EQUAL,
  JsonComparisonOperatorEnum.NOT_EQUAL,
  JsonComparisonOperatorEnum.GREATER_THAN,
  JsonComparisonOperatorEnum.LESS_THAN,
  JsonComparisonOperatorEnum.GREATER_THAN_OR_EQUAL,
  JsonComparisonOperatorEnum.LESS_THAN_OR_EQUAL,
  JsonComparisonOperatorEnum.IN,
  JsonComparisonOperatorEnum.STARTS_WITH,
  JsonComparisonOperatorEnum.ENDS_WITH,
] as const;

export const LOGICAL_OPERATORS = [
  JsonLogicOperatorEnum.AND,
  JsonLogicOperatorEnum.OR,
  JsonLogicOperatorEnum.NOT,
] as const;
