import {
  NotificationStepEntity,
  SubscriberEntity,
  EnvironmentRepository,
  SubscriberRepository,
  JobEntity,
} from '@novu/dal';
import { ITriggerPayload } from '@novu/node';
import * as _ from 'lodash';
import { createHmac } from 'crypto';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { SendMessageCommand } from '../send-message/send-message.command';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER } from '../../../shared/constants';
import axios from 'axios';

export interface IFilterVariables {
  payload: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
}

export interface IMessageFilterConfiguration {
  job: JobEntity;
  command: SendMessageCommand;
  subscriberRepository: SubscriberRepository;
  createExecutionDetails: CreateExecutionDetails;
  environmentRepository: EnvironmentRepository;
}

export async function matchMessageWithFilters(
  step: NotificationStepEntity,
  variables: IFilterVariables,
  configuration?: IMessageFilterConfiguration
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
        return await processFilter(variables, children[0], configuration);
      }

      return await handleGroupFilters(filter, variables, configuration);
    });

    return foundFilter !== undefined;
  }

  return true;
}

async function handleGroupFilters(filter, variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
  if (filter.value === 'OR') {
    return await handleOrFilters(filter, variables, configuration);
  }

  if (filter.value === 'AND') {
    return await handleAndFilters(filter, variables, configuration);
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

async function handleAndFilters(filter, variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
  const { asyncFilters, syncFilters } = splitToSyncAsync(filter);

  const foundSyncFilterMatches = syncFilters.filter((i) => processFilterEquality(variables, i));
  if (syncFilters.length !== foundSyncFilterMatches.length) {
    return false;
  }

  const foundAsyncFilterMatches = await filterAsync(asyncFilters, (i) => processFilter(variables, i, configuration));

  return foundAsyncFilterMatches.length === asyncFilters.length;
}

async function handleOrFilters(filter, variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
  const { asyncFilters, syncFilters } = splitToSyncAsync(filter);

  const syncRes = syncFilters.find((i) => processFilterEquality(variables, i));
  if (syncRes) {
    return true;
  }

  return await findAsync(asyncFilters, (i) => processFilter(variables, i, configuration));
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

async function getWebhookResponse(
  i,
  variables: IFilterVariables,
  configuration: IMessageFilterConfiguration
): Promise<Record<string, unknown>> {
  if (!i.webhookUrl) return undefined;

  const payload = await buildPayload(variables, configuration);

  try {
    return await axios.post(i.webhookUrl, payload).then((response) => {
      return response.data as Record<string, unknown>;
    });
  } catch (err) {
    throw new Error(
      JSON.stringify({
        message: err.message,
        data: EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER,
      })
    );
  }
}

async function buildPayload(variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
  if (process.env.NODE_ENV === 'test' && !configuration) return variables;

  const payload: Partial<{
    subscriber: SubscriberEntity;
    payload: Record<string, unknown>;
    hmac: string;
    identifier: string;
    channel: string;
  }> = {};

  if (variables.subscriber) {
    payload.subscriber = variables.subscriber;
  } else {
    payload.subscriber = await configuration.subscriberRepository.findOne({
      _id: configuration.command.subscriberId,
      _environmentId: configuration.command.environmentId,
    });
  }

  if (variables.payload) {
    payload.payload = variables.payload;
  }

  const environment = await configuration.environmentRepository.findOne({
    _id: configuration.command.environmentId,
    _organizationId: configuration.command.organizationId,
  });

  payload.hmac = createHmac('sha256', environment.apiKeys[0].key)
    .update(configuration.command.environmentId)
    .digest('hex');

  payload.identifier = configuration.command.identifier;
  payload.channel = configuration.command.job.type;

  return payload;
}

async function processFilter(variables: IFilterVariables, i, configuration: IMessageFilterConfiguration) {
  if (i.on === 'webhook') {
    const res = await getWebhookResponse(i, variables, configuration);

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
