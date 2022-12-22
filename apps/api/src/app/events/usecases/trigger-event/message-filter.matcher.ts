import {
  NotificationStepEntity,
  SubscriberEntity,
  EnvironmentRepository,
  SubscriberRepository,
  JobEntity,
} from '@novu/dal';
import { ITriggerPayload } from '@novu/node';
import * as _ from 'lodash';
import got from 'got';
import { createHmac } from 'crypto';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { SendMessageCommand } from '../send-message/send-message.command';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

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
    const res = await got.post(i.webhookUrl, {
      json: payload,
      retry: {
        limit: 2,
        methods: ['POST'],
      },
      hooks: {
        beforeRetry: [
          (options, error, retryCount) => {
            configuration.createExecutionDetails.execute(
              CreateExecutionDetailsCommand.create({
                ...CreateExecutionDetailsCommand.getDetailsFromJob(configuration.job),
                detail: DetailEnum.WEBHOOK_FILTER_FAILED_RETRY,
                source: ExecutionDetailsSourceEnum.WEBHOOK,
                status: ExecutionDetailsStatusEnum.PENDING,
                isTest: false,
                isRetry: false,
                raw: JSON.stringify({
                  retryCount,
                  webhookUrl: i.webhookUrl,
                  error: JSON.parse(error.response.body as string),
                }),
              })
            );
          },
        ],
      },
    });

    return res ? (JSON.parse(res.body) as Record<string, unknown>) : undefined;
  } catch (err) {
    // eslint-disable-next-line no-console
    if (err.response && err.response.body) {
      await configuration.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(configuration.job),
          detail: DetailEnum.WEBHOOK_FILTER_FAILED,
          source: ExecutionDetailsSourceEnum.WEBHOOK,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            webhookUrl: i.webhookUrl,
            error: JSON.parse(err.response.body),
          }),
        })
      );
    }

    return undefined;
  }
}

async function buildPayload(variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
  const payload: Partial<{
    subscriber: SubscriberEntity;
    payload: Record<string, unknown>;
    hmac: string;
    identifier: string;
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
