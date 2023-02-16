import * as _ from 'lodash';
import { createHmac } from 'crypto';
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { parseISO, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import {
  IBaseFieldFilterPart,
  FilterParts,
  IWebhookFilterPart,
  IRealtimeOnlineFilterPart,
  IOnlineInLastFilterPart,
  FILTER_TO_LABEL,
  FilterPartTypeEnum,
  ICondition,
} from '@novu/shared';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { SubscriberEntity, EnvironmentRepository, SubscriberRepository, StepFilter } from '@novu/dal';

import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { SendMessageCommand } from '../send-message/send-message.command';
import { EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER } from '../../../shared/constants';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import type { IFilterVariables } from './types';
import { FilterProcessingDetails } from './filter-processing-details';

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

  public async filter(
    command: SendMessageCommand,
    variables: IFilterVariables
  ): Promise<{
    passed: boolean;
    conditions: ICondition[];
  }> {
    const { step } = command;
    if (!step?.filters || !Array.isArray(step?.filters)) {
      return {
        passed: true,
        conditions: [],
      };
    }
    if (step.filters?.length) {
      const details: FilterProcessingDetails[] = [];

      const foundFilter = await findAsync(step.filters, async (filter) => {
        const filterProcessingDetails = new FilterProcessingDetails();
        filterProcessingDetails.addFilter(filter, variables);

        const children = filter.children;
        const noRules = !children || (Array.isArray(children) && children.length === 0);
        if (noRules) {
          return true;
        }

        const singleRule = !children || (Array.isArray(children) && children.length === 1);
        if (singleRule) {
          const result = await this.processFilter(variables, children[0], command, filterProcessingDetails);
          await this.createExecutionDetails.execute(
            CreateExecutionDetailsCommand.create({
              ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
              detail: DetailEnum.PROCESSING_STEP_FILTER,
              source: ExecutionDetailsSourceEnum.INTERNAL,
              status: ExecutionDetailsStatusEnum.PENDING,
              isTest: false,
              isRetry: false,
              raw: filterProcessingDetails.toString(),
            })
          );

          details.push(filterProcessingDetails);

          return result;
        }

        const result = await this.handleGroupFilters(filter, variables, command, filterProcessingDetails);
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.PROCESSING_STEP_FILTER,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.PENDING,
            isTest: false,
            isRetry: false,
            raw: filterProcessingDetails.toString(),
          })
        );

        details.push(filterProcessingDetails);

        return result;
      });

      const conditions = details
        .map((detail) => detail.toObject().conditions)
        .reduce((conditionsArray, collection) => [...collection, ...conditionsArray], []);

      return {
        passed: !!foundFilter,
        conditions: conditions,
      };
    }

    return {
      passed: true,
      conditions: [],
    };
  }

  public static sumFilters(
    summary: {
      stepFilters: string[];
      failedFilters: string[];
      passedFilters: string[];
    },
    condition: ICondition
  ) {
    let type: string = condition.filter?.toLowerCase();

    if (condition.filter === FILTER_TO_LABEL.isOnline || condition.filter === FILTER_TO_LABEL.isOnlineInLast) {
      type = 'online';
    }

    if (condition.passed && !summary.passedFilters.includes(type)) {
      summary.passedFilters.push(type);
    }

    if (!condition.passed && !summary.failedFilters.includes(type)) {
      summary.failedFilters.push(type);
    }

    if (!summary.stepFilters.includes(type)) {
      summary.stepFilters.push(type);
    }

    return summary;
  }

  private async handleGroupFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: SendMessageCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    if (filter.value === 'OR') {
      return await this.handleOrFilters(filter, variables, command, filterProcessingDetails);
    }

    if (filter.value === 'AND') {
      return await this.handleAndFilters(filter, variables, command, filterProcessingDetails);
    }

    return false;
  }

  private splitFilters(filter: StepFilter) {
    const webhookFilters = filter.children.filter((childFilter) => childFilter.on === 'webhook');

    const otherFilters = filter.children.filter((childFilter) => childFilter.on !== 'webhook');

    return { webhookFilters, otherFilters };
  }

  private async handleAndFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: SendMessageCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    const { webhookFilters, otherFilters } = this.splitFilters(filter);

    const matchedOtherFilters = await filterAsync(otherFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    );
    if (otherFilters.length !== matchedOtherFilters.length) {
      return false;
    }

    const matchedWebhookFilters = await filterAsync(webhookFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    );

    return matchedWebhookFilters.length === webhookFilters.length;
  }

  private async handleOrFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: SendMessageCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    const { webhookFilters, otherFilters } = this.splitFilters(filter);

    const foundFilter = await findAsync(otherFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    );
    if (foundFilter) {
      return true;
    }

    return !!(await findAsync(webhookFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    ));
  }

  private async processIsOnline(
    filter: IRealtimeOnlineFilterPart | IOnlineInLastFilterPart,
    command: SendMessageCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    const subscriber = await this.subscriberRepository.findOne({
      _id: command.subscriberId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    const hasNoOnlineFieldsSet =
      typeof subscriber?.isOnline === 'undefined' && typeof subscriber?.lastOnlineAt === 'undefined';
    const isOnlineString = `${subscriber?.isOnline ?? ''}`;
    const lastOnlineAtString = `${subscriber?.lastOnlineAt ?? ''}`;
    // the old subscriber created before the is online functionality should not be processed
    if (hasNoOnlineFieldsSet) {
      filterProcessingDetails.addCondition({
        filter: FILTER_TO_LABEL[filter.on],
        field: 'isOnline',
        expected: `${filter.value}`,
        actual: `${filter.on === FilterPartTypeEnum.IS_ONLINE ? isOnlineString : lastOnlineAtString}`,
        operator: `${filter.on === FilterPartTypeEnum.IS_ONLINE ? 'EQUAL' : filter.timeOperator}`,
        passed: false,
      });

      return false;
    }

    const isOnlineMatch = subscriber?.isOnline === filter.value;
    if (filter.on === FilterPartTypeEnum.IS_ONLINE) {
      filterProcessingDetails.addCondition({
        filter: FILTER_TO_LABEL[filter.on],
        field: 'isOnline',
        expected: `${filter.value}`,
        actual: isOnlineString,
        operator: 'EQUAL',
        passed: isOnlineMatch,
      });

      return isOnlineMatch;
    }

    const currentDate = new Date();
    const lastOnlineAt = subscriber?.lastOnlineAt ? parseISO(subscriber?.lastOnlineAt) : new Date();
    const diff = differenceIn(currentDate, lastOnlineAt, filter.timeOperator);
    const result = subscriber?.isOnline || (!subscriber?.isOnline && diff >= 0 && diff <= filter.value);

    filterProcessingDetails.addCondition({
      filter: FILTER_TO_LABEL[filter.on],
      field: subscriber?.isOnline ? 'isOnline' : 'lastOnlineAt',
      expected: subscriber?.isOnline ? 'true' : `${filter.value}`,
      actual: `${subscriber?.isOnline ? 'true' : diff}`,
      operator: `${filter.timeOperator}`,
      passed: result,
    });

    return result;
  }

  private processFilterEquality(
    variables: IFilterVariables,
    fieldFilter: IBaseFieldFilterPart,
    filterProcessingDetails: FilterProcessingDetails
  ): boolean {
    const actualValue = _.get(variables, [fieldFilter.on, fieldFilter.field]);
    const filterValue = this.parseValue(actualValue, fieldFilter.value);
    let result = false;

    if (fieldFilter.operator === 'EQUAL') {
      result = actualValue === filterValue;
    }
    if (fieldFilter.operator === 'NOT_EQUAL') {
      result = actualValue !== filterValue;
    }
    if (fieldFilter.operator === 'LARGER') {
      result = actualValue > filterValue;
    }
    if (fieldFilter.operator === 'SMALLER') {
      result = actualValue < filterValue;
    }
    if (fieldFilter.operator === 'LARGER_EQUAL') {
      result = actualValue >= filterValue;
    }
    if (fieldFilter.operator === 'SMALLER_EQUAL') {
      result = actualValue <= filterValue;
    }
    if (fieldFilter.operator === 'NOT_IN') {
      result = !actualValue.includes(filterValue);
    }
    if (fieldFilter.operator === 'IN') {
      result = actualValue.includes(filterValue);
    }

    const actualValueString: string = Array.isArray(actualValue) ? JSON.stringify(actualValue) : `${actualValue ?? ''}`;

    filterProcessingDetails.addCondition({
      filter: FILTER_TO_LABEL[fieldFilter.on],
      field: fieldFilter.field,
      expected: `${filterValue}`,
      actual: `${actualValueString}`,
      operator: `${fieldFilter.operator}`,
      passed: result,
    });

    return result;
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
    command: SendMessageCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    let passed = false;

    if (child.on === FilterPartTypeEnum.WEBHOOK) {
      const res = await this.getWebhookResponse(child, variables, command);
      passed = this.processFilterEquality({ payload: undefined, webhook: res }, child, filterProcessingDetails);
    }

    if (child.on === FilterPartTypeEnum.PAYLOAD || child.on === FilterPartTypeEnum.SUBSCRIBER) {
      passed = this.processFilterEquality(variables, child, filterProcessingDetails);
    }

    if (child.on === FilterPartTypeEnum.IS_ONLINE || child.on === FilterPartTypeEnum.IS_ONLINE_IN_LAST) {
      passed = await this.processIsOnline(child, command, filterProcessingDetails);
    }

    return passed;
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
