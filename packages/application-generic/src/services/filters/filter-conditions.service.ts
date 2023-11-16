import axios from 'axios';
import {
  parseISO,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';
import { Injectable } from '@nestjs/common';
import {
  EnvironmentRepository,
  ExecutionDetailsRepository,
  JobEntity,
  JobRepository,
  MessageRepository,
  StepFilter,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterParts,
  FilterPartTypeEnum,
  FILTER_TO_LABEL,
  ICondition,
  IOnlineInLastFilterPart,
  IPreviousStepFilterPart,
  IRealtimeOnlineFilterPart,
  IWebhookFilterPart,
  PreviousStepTypeEnum,
  TimeOperatorEnum,
} from '@novu/shared';
import { EmailEventStatusEnum } from '@novu/stateless';

import {
  FilterProcessingDetails,
  FilterService,
  IFilterVariables,
} from './filters.service';

import { buildSubscriberKey, CachedEntity } from '../cache';
import { Instrument } from '../../instrumentation';
import { createHash } from '../../encryption';
import {
  EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER,
  PlatformException,
} from '../../utils/exceptions';

export interface IUsedFilters {
  filters: string[];
  failedFilters: string[];
  passedFilters: string[];
}

export type WebhookPartialPayload = Partial<{
  subscriber: SubscriberEntity | null;
  payload: Record<string, unknown>;
  identifier: string;
  channel: string;
  providerId: string;
}>;

export interface IFilterConditionsResponse {
  passed: boolean;
  data: IFilterVariables;
  conditions: ICondition[];
  details: FilterProcessingDetails[];
  variables: IFilterVariables;
  usedFilters: IUsedFilters;
}

export interface IFilterProperties {
  environmentId?: string;
  identifier?: string;
  job?: JobEntity;
  organizationId?: string;
  subscriberId?: string;
  transactionId?: string;
}

@Injectable()
export class FilterConditionsService extends FilterService {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private executionDetailsRepository: ExecutionDetailsRepository,
    private jobRepository: JobRepository,
    private messageRepository: MessageRepository,
    private subscriberRepository: SubscriberRepository
  ) {
    super();
  }

  public async filter(
    filters: StepFilter[],
    variables: IFilterVariables,
    properties?: IFilterProperties
  ): Promise<IFilterConditionsResponse> {
    let conditions: ICondition[] = [];

    const filterData = await this.getFilterData(filters, variables, properties);

    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return {
        passed: true,
        data: filterData,
        conditions: [],
        details: [],
        variables,
        usedFilters: this.getUsedFilters(conditions),
      };
    }

    const details: FilterProcessingDetails[] = [];

    const foundFilter = await this.findAsync(filters, async (filter) => {
      const filterProcessingDetails = new FilterProcessingDetails();
      filterProcessingDetails.addFilter(filter, variables);

      const children = filter.children;
      const noRules =
        !children || (Array.isArray(children) && children.length === 0);
      if (noRules) {
        return true;
      }

      const singleRule =
        !children || (Array.isArray(children) && children.length === 1);
      if (singleRule) {
        const result = await this.processFilter(
          children[0],
          filterProcessingDetails,
          filterData,
          variables,
          properties
        );

        details.push(filterProcessingDetails);

        return result;
      }

      const result = await this.handleGroupFilters(
        filter,
        filterProcessingDetails,
        filterData,
        variables,
        properties
      );

      details.push(filterProcessingDetails);

      return result;
    });

    conditions = details
      .map((detail) => detail.toObject().conditions)
      .reduce(
        (conditionsArray, collection) => [...collection, ...conditionsArray],
        []
      );

    return {
      passed: !!foundFilter,
      data: filterData,
      conditions,
      details,
      variables,
      usedFilters: this.getUsedFilters(conditions),
    };
  }

  @Instrument()
  private async getFilterData(
    filters: StepFilter[],
    payload: any,
    properties: IFilterProperties
  ): Promise<IFilterVariables> {
    const { environmentId, subscriberId } = properties || {};
    if (!subscriberId && !environmentId) {
      return {
        payload,
      };
    }

    const subscriberFilterExist = filters?.find((filter) => {
      return filter?.children?.find(
        (item) => item?.on === FilterPartTypeEnum.SUBSCRIBER
      );
    });

    let subscriber;

    if (subscriberFilterExist) {
      subscriber = await this.getSubscriberBySubscriberId({
        subscriberId,
        _environmentId: environmentId,
      });
    }

    return {
      subscriber,
      payload,
    };
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  public async getSubscriberBySubscriberId({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }) {
    return await this.subscriberRepository.findOne({
      _environmentId,
      subscriberId,
    });
  }

  private getUsedFilters(conditions: ICondition[]): IUsedFilters {
    return conditions.reduce(this.sumFilters, {
      filters: [],
      failedFilters: [],
      passedFilters: [],
    });
  }

  private sumFilters(summary: IUsedFilters, condition: ICondition) {
    let type: string = condition.filter?.toLowerCase();

    if (
      condition.filter === FILTER_TO_LABEL.isOnline ||
      condition.filter === FILTER_TO_LABEL.isOnlineInLast
    ) {
      type = 'online';
    }

    if (!type) {
      type = condition.filter;
    }

    type = type?.toLowerCase();

    if (condition.passed && !summary.passedFilters.includes(type)) {
      summary.passedFilters.push(type);
    }

    if (!condition.passed && !summary.failedFilters.includes(type)) {
      summary.failedFilters.push(type);
    }

    if (!summary.filters.includes(type)) {
      summary.filters.push(type);
    }

    return summary;
  }

  private async handleGroupFilters(
    filter: StepFilter,
    filterProcessingDetails: FilterProcessingDetails,
    filterData: IFilterVariables,
    variables: IFilterVariables,
    properties: IFilterProperties
  ): Promise<boolean> {
    if (
      ![FieldLogicalOperatorEnum.AND, FieldLogicalOperatorEnum.OR].includes(
        filter.value
      )
    ) {
      return false;
    }

    const matchedOtherFilters = await this.filterAsync(filter.children, (i) =>
      this.processFilter(
        i,
        filterProcessingDetails,
        filterData,
        variables,
        properties
      )
    );

    if (filter.value === FieldLogicalOperatorEnum.OR) {
      return !!matchedOtherFilters;
    }

    if (filter.value === FieldLogicalOperatorEnum.AND) {
      return filter.children.length === matchedOtherFilters.length;
    }

    return false;
  }

  private async processFilter(
    filter: FilterParts,
    filterProcessingDetails: FilterProcessingDetails,
    filterData: IFilterVariables,
    variables: IFilterVariables,
    properties: IFilterProperties
  ): Promise<boolean> {
    let passed = false;

    if (filter.on === FilterPartTypeEnum.TENANT) {
      passed = this.processFilterEquality(
        filter,
        filterProcessingDetails,
        variables
      );
    }

    if (filter.on === FilterPartTypeEnum.WEBHOOK) {
      if (process.env.NODE_ENV === 'test') return true;

      const webhookPayload = await this.buildPayload(variables, properties);
      const res = await this.getWebhookResponse(
        filter,
        variables,
        webhookPayload,
        properties
      );
      passed = this.processFilterEquality(filter, filterProcessingDetails, {
        payload: undefined,
        webhook: res,
      });
    }

    if (filter.on === FilterPartTypeEnum.PAYLOAD) {
      passed = this.processFilterEquality(
        filter,
        filterProcessingDetails,
        variables
      );
    }

    if (filter.on === FilterPartTypeEnum.SUBSCRIBER) {
      passed = this.processFilterEquality(
        filter,
        filterProcessingDetails,
        filterData
      );
    }

    if (
      filter.on === FilterPartTypeEnum.IS_ONLINE ||
      filter.on === FilterPartTypeEnum.IS_ONLINE_IN_LAST
    ) {
      passed = await this.processIsOnline(
        filter,
        filterProcessingDetails,
        properties
      );
    }

    if (filter.on === FilterPartTypeEnum.PREVIOUS_STEP) {
      passed = await this.processPreviousStep(
        filter,
        filterProcessingDetails,
        properties
      );
    }

    return passed;
  }

  private async processPreviousStep(
    filter: IPreviousStepFilterPart,
    filterProcessingDetails: FilterProcessingDetails,
    properties: IFilterProperties
  ): Promise<boolean> {
    const job = await this.jobRepository.findOne({
      transactionId: properties.transactionId,
      _subscriberId: properties.subscriberId,
      _environmentId: properties.environmentId,
      _organizationId: properties.organizationId,
      'step.uuid': filter.step,
    });

    if (!job) {
      return true;
    }

    const message = await this.messageRepository.findOne({
      _jobId: job._id,
      _environmentId: properties.environmentId,
      _subscriberId: properties.subscriberId,
      transactionId: properties.transactionId,
    });

    if (!message) {
      return true;
    }

    const label = FILTER_TO_LABEL[filter.on];
    const field = filter.stepType;
    const expected = 'true';
    const operator = FieldOperatorEnum.EQUAL;

    if (message?.channel === ChannelTypeEnum.EMAIL) {
      const count = await this.executionDetailsRepository.count({
        _jobId: properties.job._parentId,
        _messageId: message._id,
        _environmentId: properties.environmentId,
        webhookStatus: EmailEventStatusEnum.OPENED,
      });

      const passed = [
        PreviousStepTypeEnum.UNREAD,
        PreviousStepTypeEnum.UNSEEN,
      ].includes(filter.stepType)
        ? count === 0
        : count > 0;

      filterProcessingDetails.addCondition({
        filter: label,
        field,
        expected,
        actual: `${passed}`,
        operator,
        passed,
      });

      return passed;
    }

    const value = [
      PreviousStepTypeEnum.SEEN,
      PreviousStepTypeEnum.UNSEEN,
    ].includes(filter.stepType)
      ? message.seen
      : message.read;
    const passed = [
      PreviousStepTypeEnum.UNREAD,
      PreviousStepTypeEnum.UNSEEN,
    ].includes(filter.stepType)
      ? value === false
      : value;

    filterProcessingDetails.addCondition({
      filter: label,
      field,
      expected,
      actual: `${passed}`,
      operator,
      passed,
    });

    return passed;
  }

  private async processIsOnline(
    filter: IRealtimeOnlineFilterPart | IOnlineInLastFilterPart,
    filterProcessingDetails: FilterProcessingDetails,
    properties: IFilterProperties
  ): Promise<boolean> {
    const subscriber = await this.subscriberRepository.findOne({
      _id: properties.subscriberId,
      _organizationId: properties.organizationId,
      _environmentId: properties.environmentId,
    });

    const hasNoOnlineFieldsSet =
      typeof subscriber?.isOnline === 'undefined' &&
      typeof subscriber?.lastOnlineAt === 'undefined';
    const isOnlineString = `${subscriber?.isOnline ?? ''}`;
    const lastOnlineAtString = `${subscriber?.lastOnlineAt ?? ''}`;
    // the old subscriber created before the is online functionality should not be processed
    if (hasNoOnlineFieldsSet) {
      filterProcessingDetails.addCondition({
        filter: FILTER_TO_LABEL[filter.on],
        field: 'isOnline',
        expected: `${filter.value}`,
        actual: `${
          filter.on === FilterPartTypeEnum.IS_ONLINE
            ? isOnlineString
            : lastOnlineAtString
        }`,
        operator:
          filter.on === FilterPartTypeEnum.IS_ONLINE
            ? FieldOperatorEnum.EQUAL
            : filter.timeOperator,
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
        operator: FieldOperatorEnum.EQUAL,
        passed: isOnlineMatch,
      });

      return isOnlineMatch;
    }

    const currentDate = new Date();
    const lastOnlineAt = subscriber?.lastOnlineAt
      ? parseISO(subscriber?.lastOnlineAt)
      : new Date();
    const diff = this.differenceIn(
      currentDate,
      lastOnlineAt,
      filter.timeOperator
    );
    const result =
      subscriber?.isOnline ||
      (!subscriber?.isOnline && diff >= 0 && diff <= filter.value);

    filterProcessingDetails.addCondition({
      filter: FILTER_TO_LABEL[filter.on],
      field: subscriber?.isOnline ? 'isOnline' : 'lastOnlineAt',
      expected: subscriber?.isOnline ? 'true' : `${filter.value}`,
      actual: `${subscriber?.isOnline ? 'true' : diff}`,
      operator: filter.timeOperator,
      passed: result,
    });

    return result;
  }

  private async getWebhookResponse(
    filter: IWebhookFilterPart,
    variables: IFilterVariables,
    payload: WebhookPartialPayload,
    properties: IFilterProperties
  ): Promise<Record<string, unknown> | undefined> {
    if (!filter.webhookUrl) return undefined;

    const hmac = await this.buildHmac(
      properties.organizationId,
      properties.environmentId
    );

    const config = {
      headers: {
        'nv-hmac-256': hmac,
      },
    };

    try {
      return await axios
        .post(filter.webhookUrl, payload, config)
        .then((response) => {
          return response.data as Record<string, unknown>;
        });
    } catch (err: any) {
      throw new Error(
        JSON.stringify({
          message: err.message,
          data: EXCEPTION_MESSAGE_ON_WEBHOOK_FILTER,
        })
      );
    }
  }

  private async buildPayload(
    variables: IFilterVariables,
    properties: IFilterProperties
  ): Promise<WebhookPartialPayload> {
    if (process.env.NODE_ENV === 'test') return variables;

    const payload: WebhookPartialPayload = {};

    if (variables.subscriber) {
      payload.subscriber = variables.subscriber;
    } else {
      payload.subscriber = await this.subscriberRepository.findBySubscriberId(
        properties.environmentId,
        properties.subscriberId
      );
    }

    if (variables.payload) {
      payload.payload = variables.payload;
    }

    payload.identifier = properties.identifier;
    payload.channel = properties.job.type;

    if (properties.job.providerId) {
      payload.providerId = properties.job.providerId;
    }

    return payload;
  }

  private async buildHmac(
    organizationId: string,
    environmentId: string
  ): Promise<string> {
    if (process.env.NODE_ENV === 'test') return '';

    const environment = await this.environmentRepository.findOne({
      _id: environmentId,
      _organizationId: organizationId,
    });
    if (!environment) throw new PlatformException('Environment is not found');

    return createHash(environment.apiKeys[0].key, environmentId);
  }

  private differenceIn(
    currentDate: Date,
    lastDate: Date,
    timeOperator: TimeOperatorEnum
  ): number {
    if (timeOperator === TimeOperatorEnum.MINUTES) {
      return differenceInMinutes(currentDate, lastDate);
    }

    if (timeOperator === TimeOperatorEnum.HOURS) {
      return differenceInHours(currentDate, lastDate);
    }

    return differenceInDays(currentDate, lastDate);
  }
}
