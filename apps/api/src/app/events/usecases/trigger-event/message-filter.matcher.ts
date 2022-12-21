import { NotificationStepEntity, SubscriberEntity } from '@novu/dal';
import { ITriggerPayload } from '@novu/node';
import * as _ from 'lodash';
import axios from 'axios';

export interface IFilterVariables {
  payload: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
}

export async function matchMessageWithFilters(
  step: NotificationStepEntity,
  variables: IFilterVariables
): Promise<boolean> {
  if (!step?.filters || !Array.isArray(step?.filters)) {
    return true;
  }
  if (step.filters?.length) {
    const foundFilter = await findAsync(step.filters, async (filter) => {
      const children = filter.children;
      if (!children || (Array.isArray(children) && children.length === 0)) {
        return true;
      }

      if (!children || (Array.isArray(children) && children.length === 1)) {
        return await processFilter(filter.children[0], variables);
      }

      return await handleGroupFilters(filter, variables);
    });

    return foundFilter !== undefined;
  }

  return true;
}

async function handleGroupFilters(filter, variables: IFilterVariables) {
  if (filter.value === 'OR') {
    return await handleOrFilters(filter, variables);
  }

  if (filter.value === 'AND') {
    return await handleAndFilters(filter, variables);
  }

  return false;
}

async function handleAndFilters(filter, variables: IFilterVariables) {
  // todo priority here - first sync operation then async
  const foundFilterMatches = await filterAsync(filter.children, (i) => processFilter(i, variables));

  return foundFilterMatches.length === filter.children.length;
}

async function handleOrFilters(filter, variables: IFilterVariables) {
  // todo priority here - first sync operation then async
  return await findAsync(filter.children, (i) => processFilter(i, variables));
}

function processFilterEquality(variables: IFilterVariables, i) {
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

async function getWebhookResponse(i, variables: IFilterVariables): Promise<Record<string, unknown>> {
  try {
    return await axios
      .post(i.webhookUrl, variables)
      .then((response) => {
        return response.data as Record<string, unknown>;
      })
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);

    return undefined;
  }
}

async function processFilter(i, variables: IFilterVariables) {
  if (i.on === 'webhook') {
    const res = await getWebhookResponse(i, variables);

    return processFilterEquality({ payload: undefined, webhook: res }, i);
  }

  return processFilterEquality(variables, i);
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

async function findAsync<T>(array: T[], predicate: (t: T) => Promise<boolean>): Promise<T | undefined> {
  for (const t of array) {
    if (await predicate(t)) {
      return t;
    }
  }

  return undefined;
}

async function filterAsync<T>(arr: T[], callback: (item: T) => Promise<boolean>): Promise<T[]> {
  const fail = Symbol();

  return (await Promise.all(arr.map(async (item) => ((await callback(item)) ? item : fail)))).filter(
    (i) => i !== fail
  ) as T[];
}
