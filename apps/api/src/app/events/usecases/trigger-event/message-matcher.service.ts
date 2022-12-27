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
import { Injectable } from '@nestjs/common';

export interface IFilterVariables {
  payload: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
}

export interface IMessageFilterConfiguration {
  job: JobEntity;
  command: SendMessageCommand;
}

@Injectable()
export class MessageMatcher {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private createExecutionDetails: CreateExecutionDetails,
    private environmentRepository: EnvironmentRepository
  ) {}

  public async filter(
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
        const noRules = !children || (Array.isArray(children) && children.length === 0);
        if (noRules) {
          return true;
        }

        const singleRule = !children || (Array.isArray(children) && children.length === 1);
        if (singleRule) {
          return await this.processFilter(variables, children[0], configuration);
        }

        return await this.handleGroupFilters(filter, variables, configuration);
      });

      return foundFilter !== undefined;
    }

    return true;
  }

  private async handleGroupFilters(filter, variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
    if (filter.value === 'OR') {
      return await this.handleOrFilters(filter, variables, configuration);
    }

    if (filter.value === 'AND') {
      return await this.handleAndFilters(filter, variables, configuration);
    }

    return false;
  }

  private splitToSyncAsync(filter) {
    const asyncOnFilters = ['webhook'];

    const asyncFilters = filter.children.filter((childFilter) =>
      asyncOnFilters.some((asyncOnFilter) => asyncOnFilter === childFilter.on)
    );

    const syncFilters = filter.children.filter((childFilter) =>
      asyncOnFilters.some((asyncOnFilter) => asyncOnFilter !== childFilter.on)
    );

    return { asyncFilters, syncFilters };
  }
  private async handleAndFilters(filter, variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
    const { asyncFilters, syncFilters } = this.splitToSyncAsync(filter);

    const foundSyncFilterMatches = syncFilters.filter((i) => this.processFilterEquality(variables, i));
    if (syncFilters.length !== foundSyncFilterMatches.length) {
      return false;
    }

    const foundAsyncFilterMatches = await filterAsync(asyncFilters, (i) =>
      this.processFilter(variables, i, configuration)
    );

    return foundAsyncFilterMatches.length === asyncFilters.length;
  }

  private async handleOrFilters(filter, variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
    const { asyncFilters, syncFilters } = this.splitToSyncAsync(filter);

    const syncRes = syncFilters.find((i) => this.processFilterEquality(variables, i));
    if (syncRes) {
      return true;
    }

    return await findAsync(asyncFilters, (i) => this.processFilter(variables, i, configuration));
  }

  private processFilterEquality(variables: IFilterVariables, i) {
    const payloadVariable = _.get(variables, [i.on, i.field]);
    const value = this.parseValue(payloadVariable, i.value);
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

  private async getWebhookResponse(
    child,
    variables: IFilterVariables,
    configuration: IMessageFilterConfiguration
  ): Promise<Record<string, unknown>> {
    if (!child.webhookUrl) return undefined;

    const payload = await this.buildPayload(variables, configuration);

    const hmac = await this.buildHmac(configuration);

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

  private async buildPayload(variables: IFilterVariables, configuration: IMessageFilterConfiguration) {
    if (process.env.NODE_ENV === 'test' && !configuration) return variables;

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
        _id: configuration.command.subscriberId,
        _environmentId: configuration.command.environmentId,
      });
    }

    if (variables.payload) {
      payload.payload = variables.payload;
    }

    payload.identifier = configuration.command.identifier;
    payload.channel = configuration.command.job.type;

    if (configuration.command.job.providerId) {
      payload.providerId = configuration.command.job.providerId;
    }

    return payload;
  }

  private async buildHmac(configuration: IMessageFilterConfiguration): Promise<string> {
    if (process.env.NODE_ENV === 'test' && !configuration) return '';

    const environment = await this.environmentRepository.findOne({
      _id: configuration.command.environmentId,
      _organizationId: configuration.command.organizationId,
    });

    return createHmac('sha256', environment.apiKeys[0].key).update(configuration.command.environmentId).digest('hex');
  }

  private async processFilter(variables: IFilterVariables, child, configuration: IMessageFilterConfiguration) {
    if (child.on === 'webhook') {
      const res = await this.getWebhookResponse(child, variables, configuration);

      return this.processFilterEquality({ payload: undefined, webhook: res }, child);
    }

    return this.processFilterEquality(variables, child);
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
