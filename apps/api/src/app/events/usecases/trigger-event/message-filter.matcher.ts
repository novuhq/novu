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
      const noRules = !children || (Array.isArray(children) && children.length === 0);
      if (noRules) {
        return true;
      }

      const singleRule = !children || (Array.isArray(children) && children.length === 1);
      if (singleRule) {
        return await processFilter(variables, children[0]);
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

function splitToSyncAsync(filter) {
  const asyncOnFilters = ['webhook'];

  const asyncFilters = filter.children.filter((childFilter) =>
    asyncOnFilters.some((asyncOnFilter) => asyncOnFilter === childFilter.on)
  );

  const syncFilters = filter.children.filter((childFilter) =>
    asyncOnFilters.some((asyncOnFilter) => asyncOnFilter !== childFilter.on)
  );

  return { asyncFilters, syncFilters };
}

async function handleAndFilters(filter, variables: IFilterVariables) {
  const { asyncFilters, syncFilters } = splitToSyncAsync(filter);

  const foundSyncFilterMatches = syncFilters.filter((i) => processFilterEquality(variables, i));
  if (syncFilters.length !== foundSyncFilterMatches.length) {
    return false;
  }

  const foundAsyncFilterMatches = await filterAsync(asyncFilters, (i) => processFilter(variables, i));

  return foundAsyncFilterMatches.length === asyncFilters.length;
}

async function handleOrFilters(filter, variables: IFilterVariables) {
  const { asyncFilters, syncFilters } = splitToSyncAsync(filter);

  const syncRes = syncFilters.find((i) => processFilterEquality(variables, i));
  if (syncRes) {
    return true;
  }

  return await findAsync(asyncFilters, (i) => processFilter(variables, i));
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

async function processFilter(variables: IFilterVariables, i) {
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
