import * as _ from 'lodash';
import { createHmac } from 'crypto';
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { parseISO, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import type { ITriggerPayload } from '@novu/node';
import type {
  IBaseFieldFilterPart,
  FilterParts,
  IWebhookFilterPart,
  IFieldFilterPart,
  IRealtimeOnlineFilterPart,
  IOnlineInLastFilterPart,
} from '@novu/shared';
import { SubscriberEntity, EnvironmentRepository, SubscriberRepository, StepFilter } from '@novu/dal';

import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { SendMessageCommand } from '../send-message/send-message.command';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER } from '../../../shared/constants';

export interface IFilterVariables {
  payload?: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
}

const findFilterPartByType = (filterParts: FilterParts[], type: FilterParts['on'] | FilterParts['on'][]) => {
  const types = Array.isArray(type) ? type : [type];

  return filterParts.filter((filterPart) => types.includes(filterPart.on));
};

const differenceIn = (currentDate: Date, lastDate: Date, timeOperator: 'minutes' | 'hours' | 'days') => {
  if (timeOperator === 'minutes') {
    return differenceInMinutes(currentDate, lastDate);
  }

  if (timeOperator === 'hours') {
    return differenceInHours(currentDate, lastDate);
  }

  return differenceInDays(currentDate, lastDate);
};

@Injectable()
export class MessageMatcher {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private createExecutionDetails: CreateExecutionDetails,
    private environmentRepository: EnvironmentRepository
  ) {}

  public async filter(command: SendMessageCommand, variables: IFilterVariables): Promise<boolean> {
    const { step } = command;
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
          return await this.processFilter(variables, children[0], command);
        }

        return await this.handleGroupFilters(filter, variables, command);
      });

      return foundFilter !== undefined;
    }

    return true;
  }

  private async handleGroupFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: SendMessageCommand
  ): Promise<boolean> {
    if (filter.value === 'OR') {
      return await this.handleOrFilters(filter, variables, command);
    }

    if (filter.value === 'AND') {
      return await this.handleAndFilters(filter, variables, command);
    }

    return false;
  }

  private splitToSyncAsync(filter: StepFilter) {
    const asyncFilters = findFilterPartByType(filter.children, 'webhook') as IWebhookFilterPart[];
    const syncFilters = findFilterPartByType(filter.children, ['payload', 'subscriber']) as IFieldFilterPart[];

    return { asyncFilters, syncFilters };
  }

  private async handleAndFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: SendMessageCommand
  ): Promise<boolean> {
    const { asyncFilters, syncFilters } = this.splitToSyncAsync(filter);

    const foundSyncFilterMatches = syncFilters.filter((i) => this.processFilterEquality(variables, i));
    if (syncFilters.length !== foundSyncFilterMatches.length) {
      return false;
    }

    const foundAsyncFilterMatches = await filterAsync(asyncFilters, (i) => this.processFilter(variables, i, command));

    return foundAsyncFilterMatches.length === asyncFilters.length;
  }

  private async handleOrFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: SendMessageCommand
  ): Promise<boolean> {
    const { asyncFilters, syncFilters } = this.splitToSyncAsync(filter);

    const syncRes = syncFilters.find((i) => this.processFilterEquality(variables, i));
    if (syncRes) {
      return true;
    }

    return !!(await findAsync(asyncFilters, (i) => this.processFilter(variables, i, command)));
  }

  private async processIsOnline(
    filter: IRealtimeOnlineFilterPart | IOnlineInLastFilterPart,
    command: SendMessageCommand
  ): Promise<boolean> {
    const subscriber = await this.subscriberRepository.findOne({
      _id: command.subscriberId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    const hasNoOnlineFieldsSet =
      typeof subscriber?.isOnline === 'undefined' && typeof subscriber?.lastOnlineAt === 'undefined';
    // the old subscriber created before the is online functionality should not be processed
    if (hasNoOnlineFieldsSet) {
      return false;
    }

    const isOnlineMatch = subscriber?.isOnline === filter.value;
    if (filter.on === 'isOnline') {
      return isOnlineMatch;
    }

    const currentDate = new Date();
    const lastOnlineAt = subscriber?.lastOnlineAt ? parseISO(subscriber?.lastOnlineAt) : new Date();
    const diff = differenceIn(currentDate, lastOnlineAt, filter.timeOperator);

    return subscriber?.isOnline || (!subscriber?.isOnline && diff >= 0 && diff <= filter.value);
  }

  private processFilterEquality(variables: IFilterVariables, fieldFilter: IBaseFieldFilterPart) {
    const payloadVariable = _.get(variables, [fieldFilter.on, fieldFilter.field]);
    const value = this.parseValue(payloadVariable, fieldFilter.value);

    if (fieldFilter.operator === 'EQUAL') {
      return payloadVariable === value;
    }
    if (fieldFilter.operator === 'NOT_EQUAL') {
      return payloadVariable !== value;
    }
    if (fieldFilter.operator === 'LARGER') {
      return payloadVariable > value;
    }
    if (fieldFilter.operator === 'SMALLER') {
      return payloadVariable < value;
    }
    if (fieldFilter.operator === 'LARGER_EQUAL') {
      return payloadVariable >= value;
    }
    if (fieldFilter.operator === 'SMALLER_EQUAL') {
      return payloadVariable <= value;
    }
    if (fieldFilter.operator === 'NOT_IN') {
      return !payloadVariable.includes(value);
    }
    if (fieldFilter.operator === 'IN') {
      return payloadVariable.includes(value);
    }

    return false;
  }

  private async getWebhookResponse(
    child: IWebhookFilterPart,
    variables: IFilterVariables,
    command: SendMessageCommand
  ): Promise<Record<string, unknown> | undefined> {
    if (!child.webhookUrl) return undefined;

    const payload = await this.buildPayload(variables, command);

    const hmac = await this.buildHmac(command);

    const config = {
      headers: {
        'nv-hmac-256': hmac,
      },
    };

    try {
      return await axios.post(child.webhookUrl, payload, config).then((response) => {
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

  private async buildPayload(variables: IFilterVariables, command: SendMessageCommand) {
    if (process.env.NODE_ENV === 'test') return variables;

    const payload: Partial<{
      subscriber: SubscriberEntity;
      payload: Record<string, unknown>;
      identifier: string;
      channel: string;
      providerId: string;
    }> = {};

    if (variables.subscriber) {
      payload.subscriber = variables.subscriber;
    } else {
      payload.subscriber = await this.subscriberRepository.findOne({
        _id: command.subscriberId,
        _environmentId: command.environmentId,
      });
    }

    if (variables.payload) {
      payload.payload = variables.payload;
    }

    payload.identifier = command.identifier;
    payload.channel = command.job.type;

    if (command.job.providerId) {
      payload.providerId = command.job.providerId;
    }

    return payload;
  }

  private async buildHmac(command: SendMessageCommand): Promise<string> {
    if (process.env.NODE_ENV === 'test') return '';

    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });

    return createHmac('sha256', environment.apiKeys[0].key).update(command.environmentId).digest('hex');
  }

  private async processFilter(
    variables: IFilterVariables,
    child: FilterParts,
    command: SendMessageCommand
  ): Promise<boolean> {
    if (child.on === 'webhook') {
      const res = await this.getWebhookResponse(child, variables, command);

      return this.processFilterEquality({ payload: undefined, webhook: res }, child);
    }

    if (child.on === 'payload' || child.on === 'subscriber') {
      return this.processFilterEquality(variables, child);
    }

    if (child.on === 'isOnline' || child.on === 'isOnlineInLast') {
      return this.processIsOnline(child, command);
    }

    return false;
  }

  private parseValue(originValue, parsingValue) {
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
