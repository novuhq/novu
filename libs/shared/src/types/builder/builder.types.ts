export enum FieldOperatorEnum {
  ALL_IN = 'ALL_IN',
  ANY_IN = 'ANY_IN',
  BETWEEN = 'BETWEEN',
  EQUAL = 'EQUAL',
  IN = 'IN',
  IS_DEFINED = 'IS_DEFINED',
  LARGER = 'LARGER',
  LARGER_EQUAL = 'LARGER_EQUAL',
  LIKE = 'LIKE',
  NOT_BETWEEN = 'NOT_BETWEEN',
  NOT_EQUAL = 'NOT_EQUAL',
  NOT_IN = 'NOT_IN',
  NOT_LIKE = 'NOT_LIKE',
  SMALLER = 'SMALLER',
  SMALLER_EQUAL = 'SMALLER_EQUAL',
}

export enum FieldLogicalOperatorEnum {
  AND = 'AND',
  OR = 'OR',
}

export type BuilderGroupValues = FieldLogicalOperatorEnum.AND | FieldLogicalOperatorEnum.OR;

export type BuilderFieldType = 'BOOLEAN' | 'TEXT' | 'DATE' | 'NUMBER' | 'STATEMENT' | 'LIST' | 'MULTI_LIST' | 'GROUP';

export type BuilderFieldOperator =
  | FieldOperatorEnum.LARGER
  | FieldOperatorEnum.SMALLER
  | FieldOperatorEnum.LARGER_EQUAL
  | FieldOperatorEnum.SMALLER_EQUAL
  | FieldOperatorEnum.EQUAL
  | FieldOperatorEnum.NOT_EQUAL
  | FieldOperatorEnum.ALL_IN
  | FieldOperatorEnum.ANY_IN
  | FieldOperatorEnum.NOT_IN
  | FieldOperatorEnum.BETWEEN
  | FieldOperatorEnum.NOT_BETWEEN
  | FieldOperatorEnum.LIKE
  | FieldOperatorEnum.NOT_LIKE
  | FieldOperatorEnum.IN
  | FieldOperatorEnum.IS_DEFINED;
