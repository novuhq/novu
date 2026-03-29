import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { EventType, RequestTraceInput, Trace } from '@novu/application-generic';
import {
  AnalyticsService,
  CreateNotificationJobs,
  CreateNotificationJobsCommand,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  FeatureFlagsService,
  GetPreferences,
  GetPreferencesCommand,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  Instrument,
  InstrumentUsecase,
  LogRepository,
  mapEventTypeToTitle,
  PinoLogger,
  SubscriberTopicPreference,
  TraceLogRepository,
} from '@novu/application-generic';
import {
  IntegrationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesRepository,
  TopicPreferenceEvaluation,
} from '@novu/dal';
import {
  buildWorkflowPreferences,
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
  InAppProviderIdEnum,
  ISubscribersDefine,
  PreferencesTypeEnum,
  ProvidersIdEnum,
  ResourceTypeEnum,
  SeverityLevelEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import type { RulesLogic } from 'json-logic-js';
import jsonLogic from 'json-logic-js';
import { StoreSubscriberJobs, StoreSubscriberJobsCommand } from '../store-subscriber-jobs';
import { SubscriberJobBoundCommand } from './subscriber-job-bound.command';

const LOG_CONTEXT = 'SubscriberJobBoundUseCase';

@Injectable()
export class SubscriberJobBound {
  constructor(
    private storeSubscriberJobs: StoreSubscriberJobs,
    private createNotificationJobs: CreateNotificationJobs,
    private createOrUpdateSubscriberUsecase: CreateOrUpdateSubscriberUseCase,
    private integrationRepository: IntegrationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private logger: PinoLogger,
    private analyticsService: AnalyticsService,
    private traceLogRepository: TraceLogRepository,
    private getPreferences: GetPreferences,
    private preferencesRepository: PreferencesRepository,
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SubscriberJobBoundCommand) {
    this.logger.assign({
      transactionId: command.transactionId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      contextKeys: command.contextKeys,
    });

    const {
      subscriber,
      templateId,
      environmentId,
      organizationId,
      userId,
      actor,
      tenant,
      identifier,
      _subscriberSource,
      requestCategory,
      contextKeys,
    } = command;

    let { topics } = command;

    const template = command.bridge?.workflow
      ? await this.getCodeFirstWorkflow(command)
      : await this.getWorkflow({
          _id: templateId,
          environmentId,
          organizationId,
          source: command.payload?.__source,
        });

    if (!template) {
      throw new BadRequestException(`Workflow id ${templateId} was not found`);
    }

    const templateProviderIds = await this.getProviderIdsForTemplate(environmentId, template);

    await this.validateSubscriberIdProperty(command, subscriber);

    /**
     * Due to Mixpanel HotSharding, we don't want to pass userId for production volume
     */
    const segmentUserId = ['test-workflow', 'digest-playground', 'dashboard', 'inbox-onboarding'].includes(
      command.payload?.__source
    )
      ? userId
      : '';

    this.analyticsService.mixpanelTrack('Notification event trigger - [Triggers]', segmentUserId, {
      name: template.name,
      type: template?.type || ResourceTypeEnum.REGULAR,
      origin: template?.origin,
      transactionId: command.transactionId,
      _template: template._id,
      _organization: command.organizationId,
      channels: template?.steps?.map((step) => step.template?.type),
      source: command.payload?.__source || 'api',
      subscriberSource: _subscriberSource || null,
      requestCategory: requestCategory || null,
      statelessWorkflow: !!command.bridge?.url,
    });

    const subscriberProcessed = await this.createOrUpdateSubscriberUsecase.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId,
        organizationId,
        subscriberId: subscriber?.subscriberId,
        email: subscriber?.email,
        firstName: subscriber?.firstName,
        lastName: subscriber?.lastName,
        phone: subscriber?.phone,
        avatar: subscriber?.avatar,
        locale: subscriber?.locale,
        timezone: subscriber?.timezone,
        data: subscriber?.data,
        channels: subscriber?.channels,
        activeWorkerName: process.env.ACTIVE_WORKER,
      })
    );

    // If no subscriber makes no sense to try to create notification
    if (!subscriberProcessed) {
      Logger.warn(
        `Subscriber ${JSON.stringify(subscriber.subscriberId)} of organization ${
          command.organizationId
        } in transaction ${command.transactionId} was not processed. No jobs are created.`,
        LOG_CONTEXT
      );

      await this.createSubscriberTrace(
        command,
        'subscriber_validation_failed',
        'warning',
        `Subscriber ${subscriber.subscriberId} was not processed, workflow run execution halted.`
      );

      return;
    }

    if (topics && topics.length > 0) {
      const evaluatedTopics = await this.evaluateTopicPreferences(command, topics, template._id);

      if (evaluatedTopics === null) {
        return;
      }

      topics = evaluatedTopics;
    }

    const severity = command.overrides.severity ?? template.severity ?? SeverityLevelEnum.NONE;

    let critical = false;
    if (command.bridge?.workflow) {
      critical = command.bridge.workflow.preferences?.all?.readOnly ?? false;
    } else {
      const preferences = await this.getPreferences.safeExecute(
        GetPreferencesCommand.create({
          environmentId,
          organizationId,
          subscriberId: subscriberProcessed._id,
          templateId,
          contextKeys,
        })
      );
      critical = preferences.preferences.all.readOnly;
    }

    const createNotificationJobsCommand: CreateNotificationJobsCommand = {
      environmentId,
      identifier,
      organizationId,
      overrides: command.overrides,
      payload: command.payload,
      subscriber: subscriberProcessed,
      template,
      templateProviderIds,
      to: subscriber,
      transactionId: command.transactionId,
      userId,
      tenant,
      topics,
      bridgeUrl: command.bridge?.url,
      /*
       * Only populate preferences if the command contains a `bridge` property,
       * indicating that the execution is stateless.
       *
       * TODO: refactor the Worker execution to handle both stateless and stateful workflows
       * transparently.
       */
      ...(command.bridge?.workflow && {
        preferences: buildWorkflowPreferences(command.bridge?.workflow?.preferences),
      }),
      severity,
      critical,
      contextKeys,
    };

    if (actor) {
      createNotificationJobsCommand.actor = actor;
    }

    const notificationJobs = await this.createNotificationJobs.execute(
      CreateNotificationJobsCommand.create(createNotificationJobsCommand)
    );

    await this.storeSubscriberJobs.execute(
      StoreSubscriberJobsCommand.create({
        environmentId: command.environmentId,
        jobs: notificationJobs,
        organizationId: command.organizationId,
      })
    );
  }

  private async getCodeFirstWorkflow(command: SubscriberJobBoundCommand): Promise<NotificationTemplateEntity | null> {
    const bridgeWorkflow = command.bridge?.workflow;

    if (!bridgeWorkflow) {
      return null;
    }

    const syncedWorkflowId = (
      await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        bridgeWorkflow.workflowId
      )
    )?._id;

    /*
     * Cast used to convert data type for further processing.
     * todo Needs review for potential data corruption.
     */
    return {
      ...bridgeWorkflow,
      type: ResourceTypeEnum.BRIDGE,
      _id: syncedWorkflowId,
      steps: (bridgeWorkflow.steps || []).map((step) => {
        const stepControlVariables = command.controls?.steps?.[step.stepId];

        return {
          ...step,
          bridgeUrl: command.bridge?.url,
          controlVariables: stepControlVariables,
          active: true,
          template: {
            type: step.type,
          },
        };
      }),
    } as unknown as NotificationTemplateEntity;
  }

  @Instrument()
  private async validateSubscriberIdProperty(
    command: SubscriberJobBoundCommand,
    subscriber: ISubscribersDefine
  ): Promise<boolean> {
    const subscriberIdExists = typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;

    if (!subscriberIdExists) {
      await this.createSubscriberTrace(
        command,
        'subscriber_validation_failed',
        'warning',
        `Subscriber ${subscriber.subscriberId} is missing a valid subscriberId, workflow run execution halted.`
      );
      throw new BadRequestException(
        'subscriberId under property to is not configured, please make sure all subscribers contains subscriberId property'
      );
    }

    return true;
  }

  @Instrument()
  private async getWorkflow({
    _id,
    environmentId,
    organizationId,
    source,
  }: {
    _id: string;
    environmentId: string;
    organizationId: string;
    source?: string;
  }): Promise<NotificationTemplateEntity | null> {
    return this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.WORKFLOW,
      `${environmentId}:${_id}`,
      () => this.notificationTemplateRepository.findById(_id, environmentId),
      {
        environmentId,
        organizationId,
        skipCache: !!source,
      }
    );
  }

  @InstrumentUsecase()
  private async getProviderIdsForTemplate(
    environmentId: string,
    template: NotificationTemplateEntity
  ): Promise<Record<ChannelTypeEnum, ProvidersIdEnum>> {
    const providers = {} as Record<ChannelTypeEnum, ProvidersIdEnum>;
    const channelTypesToFetch: ChannelTypeEnum[] = [];

    for (const step of template?.steps || []) {
      const type = step.template?.type;
      if (!type) continue;

      const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(type);

      if (!channelType || providers[channelType]) continue;

      if (channelType === ChannelTypeEnum.IN_APP) {
        providers[channelType] = InAppProviderIdEnum.Novu;
      } else {
        channelTypesToFetch.push(channelType);
      }
    }

    if (channelTypesToFetch.length > 0) {
      const integrations = await this.integrationRepository.find(
        {
          _environmentId: environmentId,
          active: true,
          channel: { $in: channelTypesToFetch },
        },
        'providerId channel'
      );

      for (const integration of integrations) {
        if (!providers[integration.channel]) {
          providers[integration.channel] = integration.providerId as ProvidersIdEnum;
        }
      }
    }

    return providers;
  }

  private async evaluateTopicPreferences(
    command: SubscriberJobBoundCommand,
    topics: SubscriberTopicPreference[],
    templateId: string
  ): Promise<SubscriberTopicPreference[] | null> {
    const evaluatedTopics: SubscriberTopicPreference[] = [];
    let filteredCount = 0;

    for (const topic of topics) {
      if (!topic._topicSubscriptionId || !topic.subscriptionIdentifier) {
        evaluatedTopics.push(topic);
        continue;
      }

      const evaluationResult = await this.evaluateSubscriptionPreferences(
        command,
        topic._topicSubscriptionId,
        topic.subscriptionIdentifier,
        templateId
      );

      if (!evaluationResult.result) {
        filteredCount++;

        continue;
      }

      evaluatedTopics.push({
        ...topic,
        preferenceEvaluation: evaluationResult,
      });
    }

    if (filteredCount > 0) {
      const status = evaluatedTopics.length > 0 ? 'success' : 'warning';
      await this.createSubscriberTrace(
        command,
        'topic_subscription_preference_evaluation',
        status,
        `${filteredCount} topic subscription(s) filtered by preferences`,
        {
          totalSubscriptionEvaluated: topics.length,
          totalSubscriptionFiltered: filteredCount,
        }
      );
    }

    return evaluatedTopics.length > 0 ? evaluatedTopics : null;
  }

  private async evaluateSubscriptionPreferences(
    command: SubscriberJobBoundCommand,
    internalSubscriptionId: string,
    subscriptionIdentifier: string,
    templateId: string
  ): Promise<TopicPreferenceEvaluation> {
    try {
      const useContextFiltering = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
      });

      const contextQuery = this.preferencesRepository.buildContextExactMatchQuery(command.contextKeys, {
        enabled: useContextFiltering,
      });

      const subscriptionPreference = await this.preferencesRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _templateId: templateId,
        _topicSubscriptionId: internalSubscriptionId,
        type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
        ...contextQuery,
      });

      if (subscriptionPreference) {
        const passes = await this.evaluatePreferenceCondition(subscriptionPreference.preferences, command.payload);
        const condition = subscriptionPreference.preferences.all?.condition;

        if (!passes) {
          return {
            result: false,
            subscriptionIdentifier,
            condition: condition !== undefined && condition !== null ? condition : undefined,
          };
        }

        return {
          result: true,
          subscriptionIdentifier,
          condition: condition !== undefined && condition !== null ? condition : undefined,
        };
      }

      return { result: true, subscriptionIdentifier };
    } catch (error) {
      this.logger.error(
        {
          error,
          subscriberId: command.subscriber.subscriberId,
          workflowId: templateId,
          transactionId: command.transactionId,
        },
        'Error evaluating subscription preferences, allowing subscription to pass through'
      );

      return { result: true, subscriptionIdentifier };
    }
  }

  private async evaluatePreferenceCondition(
    preferences: WorkflowPreferencesPartial,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    const condition = preferences.all?.condition;

    if (condition !== undefined && condition !== null) {
      try {
        const result = jsonLogic.apply(condition as RulesLogic, { payload });

        if (typeof result !== 'boolean') {
          this.logger.warn(
            {
              condition,
              result,
            },
            'Preference condition evaluation did not return a boolean, treating as false'
          );

          return false;
        }

        return result;
      } catch (error) {
        this.logger.error(
          {
            error,
            condition,
          },
          'Error evaluating preference condition, treating as false'
        );

        return false;
      }
    }

    const enabled = preferences.all?.enabled;

    if (enabled === undefined || enabled === null) {
      return true;
    }

    return enabled;
  }

  private async createSubscriberTrace(
    command: SubscriberJobBoundCommand,
    eventType: EventType,
    status: 'success' | 'error' | 'warning' = 'success',
    message?: string,
    rawData?: Record<string, unknown>
  ): Promise<void> {
    if (!command.requestId) {
      return;
    }

    try {
      const traceData: RequestTraceInput = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: command.organizationId,
        environment_id: command.environmentId,
        user_id: command.userId,
        subscriber_id: '',
        external_subscriber_id: command.subscriber?.subscriberId || '',
        event_type: eventType,
        title: mapEventTypeToTitle(eventType),
        message: message || '',
        raw_data: rawData ? JSON.stringify(rawData) : '',
        status,
        entity_id: command.requestId,
        workflow_run_identifier: command.identifier,
        workflow_id: command.templateId,
        provider_id: '',
      };

      await this.traceLogRepository.createRequest([traceData]);
    } catch (error) {
      this.logger.error(
        {
          error,
          eventType,
          transactionId: command.transactionId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        },
        'Failed to create subscriber trace'
      );
    }
  }
}
