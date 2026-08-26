import type { Operator } from 'react-querybuilder';
import type { FieldDataType } from '@/utils/parseStepVariables';

const FIELD_TYPE_OPERATORS: Record<FieldDataType, Operator[]> = {
  string: [
    { name: '=', label: 'equals' },
    { name: '!=', label: 'does not equal' },
    { name: 'isEmpty', label: 'is empty' },
    { name: 'isNonEmpty', label: 'is not empty' },
    { name: 'contains', label: 'contains' },
    { name: 'beginsWith', label: 'begins with' },
    { name: 'endsWith', label: 'ends with' },
    { name: 'doesNotContain', label: 'does not contain' },
    { name: 'doesNotBeginWith', label: 'does not begin with' },
    { name: 'doesNotEndWith', label: 'does not end with' },
    { name: 'null', label: 'is null' },
    { name: 'notNull', label: 'is not null' },
    { name: 'in', label: 'in' },
    { name: 'notIn', label: 'not in' },
  ],
  number: [
    { name: '=', label: 'equals' },
    { name: '!=', label: 'does not equal' },
    { name: '<', label: 'less than' },
    { name: '<=', label: 'less than or equal to' },
    { name: '>', label: 'greater than' },
    { name: '>=', label: 'greater than or equal to' },
    { name: 'between', label: 'between' },
    { name: 'notBetween', label: 'not between' },
    { name: 'null', label: 'is null' },
    { name: 'notNull', label: 'is not null' },
  ],
  boolean: [
    { name: '=', label: 'is' },
    { name: '!=', label: 'is not' },
    { name: 'null', label: 'is null' },
    { name: 'notNull', label: 'is not null' },
  ],
  date: [
    { name: '=', label: 'on' },
    { name: '!=', label: 'not on' },
    { name: '<', label: 'before' },
    { name: '<=', label: 'on or before' },
    { name: '>', label: 'after' },
    { name: '>=', label: 'on or after' },
    { name: 'between', label: 'between' },
    { name: 'notBetween', label: 'not between' },
    { name: 'moreThanXAgo', label: 'more than X ago' },
    { name: 'lessThanXAgo', label: 'less than X ago' },
    { name: 'withinLast', label: 'within last' },
    { name: 'notWithinLast', label: 'not within last' },
    { name: 'exactlyXAgo', label: 'exactly X ago' },
    { name: 'null', label: 'is null' },
    { name: 'notNull', label: 'is not null' },
  ],
  datetime: [
    { name: '=', label: 'at' },
    { name: '!=', label: 'not at' },
    { name: '<', label: 'before' },
    { name: '<=', label: 'at or before' },
    { name: '>', label: 'after' },
    { name: '>=', label: 'at or after' },
    { name: 'between', label: 'between' },
    { name: 'notBetween', label: 'not between' },
    { name: 'moreThanXAgo', label: 'more than X ago' },
    { name: 'lessThanXAgo', label: 'less than X ago' },
    { name: 'withinLast', label: 'within last' },
    { name: 'notWithinLast', label: 'not within last' },
    { name: 'exactlyXAgo', label: 'exactly X ago' },
    { name: 'null', label: 'is null' },
    { name: 'notNull', label: 'is not null' },
  ],
  array: [
    { name: 'contains', label: 'contains' },
    { name: 'doesNotContain', label: 'does not contain' },
    { name: 'containsAny', label: 'contains any of' },
    { name: 'doesNotContainAny', label: 'does not contain any of' },
    { name: 'null', label: 'is null' },
    { name: 'notNull', label: 'is not null' },
  ],
  object: [
    { name: 'null', label: 'is null' },
    { name: 'notNull', label: 'is not null' },
  ],
};

export function getOperatorsForFieldType(dataType: FieldDataType): Operator[] {
  return FIELD_TYPE_OPERATORS[dataType] || FIELD_TYPE_OPERATORS.string;
}

const RELATIVE_DATE_OPERATORS = ['moreThanXAgo', 'lessThanXAgo', 'withinLast', 'notWithinLast', 'exactlyXAgo'] as const;
const UNARY_JSON_LOGIC_OPERATORS = ['isEmpty', 'isNonEmpty'] as const;
const VALUELESS_OPERATORS = ['null', 'notNull', ...UNARY_JSON_LOGIC_OPERATORS] as const;

export function isRelativeDateOperator(operator: string): boolean {
  return RELATIVE_DATE_OPERATORS.includes(operator as any);
}

export function isUnaryJsonLogicOperator(operator: string): boolean {
  return UNARY_JSON_LOGIC_OPERATORS.some((candidate) => candidate === operator);
}

export function isValuelessOperator(operator: string): boolean {
  return VALUELESS_OPERATORS.some((candidate) => candidate === operator);
}
