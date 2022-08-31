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
  if (i.operator === 'EQUAL') {
    return _.get(payloadVariables, [i.on, i.field]) === i.value;
  }
  if (i.operator === 'NOT_EQUAL') {
    return _.get(payloadVariables, [i.on, i.field]) !== i.value;
  }

  return false;
}
