export type BuilderGroupValues = 'AND' | 'OR';

export type BuilderFieldType = 'BOOLEAN' | 'TEXT' | 'DATE' | 'NUMBER' | 'STATEMENT' | 'LIST' | 'MULTI_LIST' | 'GROUP';

export type BuilderFieldOperator =
  | 'LARGER'
  | 'SMALLER'
  | 'LARGER_EQUAL'
  | 'SMALLER_EQUAL'
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'ALL_IN'
  | 'ANY_IN'
  | 'NOT_IN'
  | 'BETWEEN'
  | 'NOT_BETWEEN'
  | 'LIKE'
  | 'NOT_LIKE'
  | 'IN';
