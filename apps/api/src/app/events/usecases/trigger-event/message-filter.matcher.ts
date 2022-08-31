import { NotificationStepEntity } from '@novu/dal';
import * as _ from 'lodash';

export function matchMessageWithFilters(step: NotificationStepEntity, payloadVariables: any): boolean {
  if (step.filters?.length) {
    const foundFilter = step.filters.find((filter) => {
      return handleGroupFilters(filter, payloadVariables);
    });

    return foundFilter !== undefined;
  }

  return true;
}

function handleGroupFilters(filter, payloadVariables) {
  if (filter.value === 'OR') {
    return handleOrFilters(filter, payloadVariables);
  }

  if (filter.value === 'AND') {
    return handleAndFilters(filter, payloadVariables);
  }

  return false;
}

function handleAndFilters(filter, payloadVariables) {
  const foundFilterMatches = filter.children.filter((i) => processFilterEquality(i, payloadVariables));

  return foundFilterMatches.length === filter.children.length;
}

function handleOrFilters(filter, payloadVariables) {
  return filter.children.find((i) => processFilterEquality(i, payloadVariables));
}

function processFilterEquality(i, payloadVariables) {
  const payloadVariable = _.get(payloadVariables, [i.on, i.field]);
  const value = parseValue(payloadVariable, i.value);
  if (i.operator === 'EQUAL') {
    return payloadVariable === value;
  }
  if (i.operator === 'NOT_EQUAL') {
    return payloadVariable !== value;
  }
  if (i.operator === 'LARGER') {
    return payloadVariable > value;
  }
  if (i.operator === 'SMALLER') {
    return payloadVariable < value;
  }
  if (i.operator === 'LARGER_EQUAL') {
    return payloadVariable >= value;
  }
  if (i.operator === 'SMALLER_EQUAL') {
    return payloadVariable <= value;
  }

  return false;
}

function parseValue(originValue, parsingValue) {
  switch (typeof originValue) {
    case 'number':
      return Number(parsingValue);
    case 'string':
      return String(parsingValue);
    case 'boolean':
      return parsingValue === 'true';
    case 'bigint':
      return Number(parsingValue);
    default:
      return parsingValue;
  }
}
