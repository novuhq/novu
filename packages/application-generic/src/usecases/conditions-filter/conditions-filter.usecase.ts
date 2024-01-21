import { forwardRef, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  EnvironmentRepository,
  ExecutionDetailsRepository,
  MessageRepository,
  StepFilter,
  SubscriberEntity,
  SubscriberRepository,
  JobRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  FILTER_TO_LABEL,
  FilterParts,
  FilterPartTypeEnum,
  ICondition,
  IOnlineInLastFilterPart,
  IPreviousStepFilterPart,
  IRealtimeOnlineFilterPart,
  IWebhookFilterPart,
  PreviousStepTypeEnum,
  TimeOperatorEnum,
  IMessageFilter,
  FieldOperatorEnum,
  FieldLogicalOperatorEnum,
  ExecutionDetailsSourceEnum,
  IJob,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';
import { Filter } from '../../utils/filter';
import {
  FilterProcessingDetails,
  IFilterVariables,
} from '../../utils/filter-processing-details';
import { ConditionsFilterCommand } from './conditions-filter.command';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
} from 'date-fns';
import { EmailEventStatusEnum } from '@novu/stateless';
import { PlatformException } from '../../utils/exceptions';
import { createHash } from '../../utils/hmac';
import { Instrument } from '../../instrumentation';
import { CachedEntity } from '../../services/cache/interceptors/cached-entity.interceptor';
import { buildSubscriberKey } from '../../services/cache/key-builders/entities';
import { CompileTemplate, CompileTemplateCommand } from '../compile-template';
import { DetailEnum } from '../create-execution-details';
import {
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '../execution-log-route';

@Injectable()
export class ConditionsFilter extends Filter {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private messageRepository: MessageRepository,
    private executionDetailsRepository: ExecutionDetailsRepository,
    private jobRepository: JobRepository,
    private tenantRepository: TenantRepository,
    private environmentRepository: EnvironmentRepository,
    @Inject(forwardRef(() => ExecutionLogRoute))
    private executionLogRoute: ExecutionLogRoute,
    private compileTemplate: CompileTemplate
  ) {
    super();
  }

  public async filter(command: ConditionsFilterCommand): Promise<{
    passed: boolean;
    conditions: ICondition[];
    variables: IFilterVariables;
  }> {
    const variables = await this.normalizeVariablesData(command);
    const filters = this.extractFilters(command);

    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return {
        passed: true,
        conditions: [],
        variables: variables,
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
          variables,
          children[0],
          command,
          filterProcessingDetails
        );

        details.push(filterProcessingDetails);

        return result;
      }

      const result = await this.handleGroupFilters(
        filter,
        variables,
        command,
        filterProcessingDetails
      );

      details.push(filterProcessingDetails);

      return result;
    });

    const conditions = details
      .map((detail) => detail.toObject().conditions)
      .reduce(
        (conditionsArray, collection) => [...collection, ...conditionsArray],
        []
      );

    return {
      passed: !!foundFilter,
      conditions,
      variables,
    };
  }

  private extractFilters(command: ConditionsFilterCommand) {
    return command.filters?.length
      ? command.filters
      : command.step?.filters?.length
      ? command.step.filters
      : [];
  }

  public static sumFilters(
    summary: {
      filters: string[];
      failedFilters: string[];
      passedFilters: string[];
    },
    condition: ICondition
  ) {
    let type: string = condition.filter?.toLowerCase();

    if (
      condition.filter === FILTER_TO_LABEL.isOnline ||
      condition.filter === FILTER_TO_LABEL.isOnlineInLast
    ) {
      type = 'online';
    }

    return Filter.sumFilters(summary, condition, type);
  }

  private async processPreviousStep(
    filter: IPreviousStepFilterPart,
    command: ConditionsFilterCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    const job = await this.jobRepository.findOne({
      transactionId: command.job.transactionId,
      // backward compatibility - ternary needed to be removed once the queue renewed
      _subscriberId: command.job._subscriberId
        ? command.job._subscriberId
        : command.job.subscriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      'step.uuid': filter.step,
    });

    if (!job) {
      return true;
    }

    const message = await this.messageRepository.findOne({
      _jobId: job._id,
      _environmentId: command.environmentId,
      // backward compatibility - ternary needed to be removed once the queue renewed
      _subscriberId: command.job._subscriberId
        ? command.job._subscriberId
        : command.job.subscriberId,
      transactionId: command.job.transactionId,
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
        _jobId: command.job._parentId,
        _messageId: message._id,
        _environmentId: command.environmentId,
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
    command: ConditionsFilterCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    const subscriber = await this.getSubscriberBySubscriberId({
      subscriberId: command.job.subscriberId,
      _environmentId: command.environmentId,
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
    const diff = differenceIn(currentDate, lastOnlineAt, filter.timeOperator);
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
    child: IWebhookFilterPart,
    variables: IFilterVariables,
    command: ConditionsFilterCommand
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
      return await axios
        .post(child.webhookUrl, payload, config)
        .then((response) => {
          return response.data as Record<string, unknown>;
        });
    } catch (err: any) {
      throw new Error(
        JSON.stringify({
          message: err.message,
          data: 'Exception while performing webhook request.',
        })
      );
    }
  }

  private async buildHmac(command: ConditionsFilterCommand): Promise<string> {
    if (process.env.NODE_ENV === 'test') return '';

    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });
    if (!environment) throw new PlatformException('Environment is not found');

    return createHash(environment.apiKeys[0].key, command.environmentId);
  }

  private async buildPayload(
    variables: IFilterVariables,
    command: ConditionsFilterCommand
  ) {
    if (process.env.NODE_ENV === 'test') return variables;

    const payload: Partial<{
      subscriber: SubscriberEntity | null;
      payload: Record<string, unknown>;
      identifier: string;
      channel: string;
      providerId: string;
    }> = {};

    if (variables.subscriber) {
      payload.subscriber = variables.subscriber;
    } else {
      payload.subscriber = await this.subscriberRepository.findBySubscriberId(
        command.environmentId,
        command.job.subscriberId
      );
    }

    if (variables.payload) {
      payload.payload = variables.payload;
    }

    payload.identifier = command.job.identifier;
    payload.channel = command.job.type;

    if (command.job.providerId) {
      payload.providerId = command.job.providerId;
    }

    return payload;
  }

  private async processFilter(
    variables: IFilterVariables,
    child: FilterParts,
    command: ConditionsFilterCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    let passed = false;

    if (child.on === FilterPartTypeEnum.WEBHOOK) {
      if (process.env.NODE_ENV === 'test') return true;
      child.value = await this.compileFilter(
        child.value,
        variables,
        command.job
      );
      const res = await this.getWebhookResponse(child, variables, command);
      passed = this.processFilterEquality(
        { payload: undefined, webhook: res },
        child,
        filterProcessingDetails
      );
    }

    if (
      child.on === FilterPartTypeEnum.TENANT ||
      child.on === FilterPartTypeEnum.PAYLOAD ||
      child.on === FilterPartTypeEnum.SUBSCRIBER
    ) {
      child.value = await this.compileFilter(
        child.value,
        variables,
        command.job
      );

      passed = this.processFilterEquality(
        variables,
        child,
        filterProcessingDetails
      );
    }

    if (
      child.on === FilterPartTypeEnum.IS_ONLINE ||
      child.on === FilterPartTypeEnum.IS_ONLINE_IN_LAST
    ) {
      passed = await this.processIsOnline(
        child,
        command,
        filterProcessingDetails
      );
    }

    if (child.on === FilterPartTypeEnum.PREVIOUS_STEP) {
      passed = await this.processPreviousStep(
        child,
        command,
        filterProcessingDetails
      );
    }

    return passed;
  }
  private async handleGroupFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: ConditionsFilterCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    if (filter.value === FieldLogicalOperatorEnum.OR) {
      return await this.handleOrFilters(
        filter,
        variables,
        command,
        filterProcessingDetails
      );
    }

    if (filter.value === FieldLogicalOperatorEnum.AND) {
      return await this.handleAndFilters(
        filter,
        variables,
        command,
        filterProcessingDetails
      );
    }

    return false;
  }

  private async handleAndFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: ConditionsFilterCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    const { webhookFilters, otherFilters } = this.splitFilters(filter);

    const matchedOtherFilters = await this.filterAsync(otherFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    );
    if (otherFilters.length !== matchedOtherFilters.length) {
      return false;
    }

    const matchedWebhookFilters = await this.filterAsync(webhookFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    );

    return matchedWebhookFilters.length === webhookFilters.length;
  }

  private splitFilters(filter: StepFilter) {
    const webhookFilters = filter.children.filter(
      (childFilter) => childFilter.on === 'webhook'
    );

    const otherFilters = filter.children.filter(
      (childFilter) => childFilter.on !== 'webhook'
    );

    return { webhookFilters, otherFilters };
  }

  private async handleOrFilters(
    filter: StepFilter,
    variables: IFilterVariables,
    command: ConditionsFilterCommand,
    filterProcessingDetails: FilterProcessingDetails
  ): Promise<boolean> {
    const { webhookFilters, otherFilters } = this.splitFilters(filter);

    const foundFilter = await this.findAsync(otherFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    );
    if (foundFilter) {
      return true;
    }

    return !!(await this.findAsync(webhookFilters, (i) =>
      this.processFilter(variables, i, command, filterProcessingDetails)
    ));
  }

  @Instrument()
  private async normalizeVariablesData(command: ConditionsFilterCommand) {
    const filterVariables: IFilterVariables = {};

    const combinedFilters = [
      command.step,
      ...(command.step?.variants || []),
    ].flatMap((variant) => (variant?.filters ? variant?.filters : []));

    filterVariables.subscriber = await this.fetchSubscriberIfMissing(
      command,
      combinedFilters
    );
    filterVariables.tenant = await this.fetchTenantIfMissing(
      command,
      combinedFilters
    );
    filterVariables.payload = command.variables?.payload
      ? command.variables?.payload
      : command.job?.payload ?? undefined;

    filterVariables.step = command.variables?.step ?? undefined;
    filterVariables.actor = command.variables?.actor ?? undefined;

    return filterVariables;
  }

  private async fetchSubscriberIfMissing(
    command: ConditionsFilterCommand,
    filters: IMessageFilter[]
  ): Promise<SubscriberEntity | undefined> {
    if (command.variables?.subscriber) {
      return command.variables.subscriber;
    }

    const subscriberFilterExist = filters?.find((filter) => {
      return filter?.children?.find((item) => item?.on === 'subscriber');
    });

    if (subscriberFilterExist && command.job) {
      return (
        (await this.getSubscriberBySubscriberId({
          subscriberId: command.job.subscriberId,
          _environmentId: command.environmentId,
        })) ?? undefined
      );
    }

    return undefined;
  }

  private async fetchTenantIfMissing(
    command: ConditionsFilterCommand,
    filters: IMessageFilter[]
  ): Promise<TenantEntity | undefined> {
    if (command.variables?.tenant) {
      return command.variables.tenant;
    }

    const tenantIdentifier =
      typeof command.job?.tenant === 'string'
        ? command.job?.tenant
        : command.job?.tenant?.identifier;
    const tenantFilterExist = filters?.find((filter) => {
      return filter?.children?.find((item) => item?.on === 'tenant');
    });

    if (tenantFilterExist && tenantIdentifier && command.job) {
      return (
        (await this.tenantRepository.findOne({
          _environmentId: command.job._environmentId,
          identifier: tenantIdentifier,
        })) ?? undefined
      );
    }

    return undefined;
  }

  private async compileFilter(
    value: string,
    variables: IFilterVariables,
    job: IJob
  ): Promise<string | undefined> {
    try {
      return await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          template: value,
          data: {
            ...variables,
          },
        })
      );
    } catch (e: any) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(job),
          detail: DetailEnum.PROCESSING_STEP_FILTER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: e?.message }),
        })
      );

      return;
    }
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
}

const differenceIn = (
  currentDate: Date,
  lastDate: Date,
  timeOperator: TimeOperatorEnum
) => {
  if (timeOperator === TimeOperatorEnum.MINUTES) {
    return differenceInMinutes(currentDate, lastDate);
  }

  if (timeOperator === TimeOperatorEnum.HOURS) {
    return differenceInHours(currentDate, lastDate);
  }

  return differenceInDays(currentDate, lastDate);
};
