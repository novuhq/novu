import { NotificationStepEntity, SubscriberEntity } from '@novu/dal';
import { ITriggerPayload } from '@novu/node';
import * as _ from 'lodash';

export interface IFilterVariables {
  payload: ITriggerPayload;
  subscriber?: SubscriberEntity;
}

export function matchMessageWithFilters(step: NotificationStepEntity, variables: IFilterVariables): boolean {
  if (!step?.filters || !Array.isArray(step?.filters)) {
    return true;
  }
  if (step.filters?.length) {
    const foundFilter = step.filters.find((filter) => {
      const children = filter.children;
      if (!children || (Array.isArray(children) && children.length === 0)) {
        return true;
      }

      return handleGroupFilters(filter, variables);
    });

    return foundFilter !== undefined;
  }

  return true;
}

function handleGroupFilters(filter, variables: IFilterVariables) {
  if (filter.value === 'OR') {
    return handleOrFilters(filter, variables);
  }

  if (filter.value === 'AND') {
    return handleAndFilters(filter, variables);
  }

  return false;
}

function handleAndFilters(filter, variables: IFilterVariables) {
  const foundFilterMatches = filter.children.filter((i) => processFilterEquality(i, variables));

  return foundFilterMatches.length === filter.children.length;
}

function handleOrFilters(filter, variables: IFilterVariables) {
  return filter.children.find((i) => processFilterEquality(i, variables));
}

function processFilterEquality(i, variables: IFilterVariables) {
  const payloadVariable = _.get(variables, [i.on, i.field]);
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
  if (i.operator === 'NOT_IN') {
    return !payloadVariable.includes(value);
  }
  if (i.operator === 'IN') {
    return payloadVariable.includes(value);
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
