import { Logger } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackendMode } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BulkJobOptions, BullMqService, JobsOptions, Queue, QueueOptions } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { SqsService } from '../sqs';

const LOG_CONTEXT = 'QueueService';

export class QueueBaseService {
  private bullMqService: BullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;
  public queue: Queue;

  constructor(
    public readonly topic: JobTopicNameEnum,
    bullMqService: BullMqService,
    protected sqsService?: SqsService,
    protected featureFlagsService?: FeatureFlagsService,
    protected organizationRepository?: CommunityOrganizationRepository,
    protected logger?: PinoLogger
  ) {
    this.bullMqService = bullMqService;
    if (logger) {
      this.logger.setContext(LOG_CONTEXT);
    }
  }

  public createQueue(overrideOptions?: QueueOptions): void {
    const options = {
      ...this.getQueueOptions(),
      ...(overrideOptions && {
        defaultJobOptions: {
          ...this.getQueueOptions().defaultJobOptions,
          ...overrideOptions.defaultJobOptions,
        },
      }),
    };

    this.queue = this.bullMqService.createQueue(this.topic, options);
  }

  private getQueueOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    };
  }

  public isReady(): boolean {
    return this.bullMqService.isClientReady();
  }

  public async isPaused(): Promise<boolean> {
    return await this.bullMqService.isQueuePaused();
  }

  public async getStatus() {
    return await this.bullMqService.getStatus();
  }

  public async getGroupsJobsCount() {
    return await (this.bullMqService.queue as any).getGroupsJobsCount();
  }

  public async getWaitingCount() {
    return await this.bullMqService.queue.getWaitingCount();
  }

  public async getDelayedCount() {
    return await this.bullMqService.queue.getDelayedCount();
  }

  public async getActiveCount() {
    return await this.bullMqService.queue.getActiveCount();
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log(`Shutting the ${this.topic} queue service down`, LOG_CONTEXT);

    this.queue = undefined;
    await this.bullMqService.gracefulShutdown();

    Logger.log(`Shutting down the ${this.topic} queue service has finished`, LOG_CONTEXT);
  }

  public async add(params: IJobParams) {
    // Check if job has delay - SQS doesn't support delays, so force BullMQ
    const delay = params.options?.delay || 0;
    if (delay > 0) {
      Logger.log(
        {
          topic: this.topic,
          delay,
          jobName: params.name,
        },
        'Job has delay, routing to BullMQ (SQS does not support delays)',
        LOG_CONTEXT
      );
      return await this.addToBullMQ(params);
    }

    // Check for environment variable first (for testing/global config)
    const envQueueMode = process.env.QUEUE_BACKEND_MODE_OVERRIDE;
    if (envQueueMode) {
      Logger.log(
        {
          topic: this.topic,
          queueBackendMode: envQueueMode,
          source: 'environment_variable',
        },
        'Using queue backend mode from environment variable',
        LOG_CONTEXT
      );
      return await this.routeByMode(params, envQueueMode);
    }

    // If SQS services are not configured, fall back to BullMQ only
    if (!this.sqsService || !this.featureFlagsService || !this.organizationRepository) {
      Logger.log(
        {
          topic: this.topic,
          hasSqsService: !!this.sqsService,
          hasFeatureFlagsService: !!this.featureFlagsService,
          hasOrganizationRepository: !!this.organizationRepository,
        },
        'SQS services not configured, using BullMQ',
        LOG_CONTEXT
      );
      return await this.addToBullMQ(params);
    }

    // Check if organization and environment are available in the data
    const organizationId = this.extractOrganizationId(params.data);
    const environmentId = this.extractEnvironmentId(params.data);

    if (!organizationId || !environmentId) {
      Logger.warn(
        {
          topic: this.topic,
          hasOrganizationId: !!organizationId,
          hasEnvironmentId: !!environmentId,
        },
        'Missing organization or environment ID, falling back to BullMQ',
        LOG_CONTEXT
      );
      return await this.addToBullMQ(params);
    }

    // Get organization for feature flag evaluation
    const organization = await this.organizationRepository.findOne({ _id: organizationId }, 'apiServiceLevel', {
      readPreference: 'secondaryPreferred',
    });

    if (!organization) {
      Logger.warn({ organizationId }, 'Organization not found, falling back to BullMQ', LOG_CONTEXT);
      return await this.addToBullMQ(params);
    }

    // Check queue backend mode feature flag
    const queueBackendMode = await this.featureFlagsService.getFlag<string>({
      key: FeatureFlagsKeysEnum.QUEUE_BACKEND_MODE,
      defaultValue: QueueBackendMode.BULLMQ,
      organization: { _id: organizationId, apiServiceLevel: organization.apiServiceLevel },
      environment: { _id: environmentId },
    });

    Logger.log(
      {
        topic: this.topic,
        queueBackendMode,
        organizationId,
        environmentId,
        source: 'feature_flag',
      },
      'Queue backend mode evaluation',
      LOG_CONTEXT
    );

    return await this.routeByMode(params, queueBackendMode, organizationId);
  }

  private async routeByMode(params: IJobParams, queueBackendMode: string, organizationId?: string): Promise<void> {
    const orgId = organizationId || this.extractOrganizationId(params.data) || 'unknown';

    // If SQS service not available, force BullMQ mode
    if (!this.sqsService && queueBackendMode !== QueueBackendMode.BULLMQ) {
      Logger.warn(
        {
          topic: this.topic,
          requestedMode: queueBackendMode,
          actualMode: QueueBackendMode.BULLMQ,
        },
        'SQS service not available, forcing BullMQ mode',
        LOG_CONTEXT
      );
      return await this.addToBullMQ(params);
    }

    switch (queueBackendMode) {
      case QueueBackendMode.BULLMQ:
        return await this.addToBullMQ(params);

      case QueueBackendMode.SHADOW:
        await this.addToBullMQ(params);
        try {
          await this.addToSQS(params, orgId);
        } catch (error) {
          if (this.logger) {
            this.logger.warn(
              { error: error instanceof Error ? error.message : String(error) },
              'SQS failed in shadow mode, but BullMQ job was added successfully'
            );
          }
        }
        break;

      case QueueBackendMode.LIVE:
        await this.addToSQS(params, orgId);
        await this.addToBullMQ({
          ...params,
          data: {
            ...params.data,
            skipProcessing: true,
          },
        });
        break;

      case QueueBackendMode.COMPLETE:
        return await this.addToSQS(params, orgId);

      default:
        Logger.warn({ mode: queueBackendMode }, 'Unknown queue backend mode, falling back to BullMQ', LOG_CONTEXT);
        return await this.addToBullMQ(params);
    }
  }

  protected async addToBullMQ(params: IJobParams) {
    const jobOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      ...params.options,
    };

    const payloadSize = this.calculatePayloadSize(params.data);
    Logger.log(
      `Adding job to BullMQ queue. Topic: ${this.topic}, Job: ${params.name}, Payload size: ${payloadSize} bytes`,
      LOG_CONTEXT
    );

    await this.bullMqService.add(params.name, params.data, jobOptions, params.groupId);
  }

  protected async addToSQS(params: IJobParams, organizationId: string) {
    const producer = this.sqsService.getProducer(this.topic);
    if (!producer) {
      Logger.warn({ topic: this.topic }, 'No SQS producer configured, falling back to BullMQ', LOG_CONTEXT);
      return await this.addToBullMQ(params);
    }

    const messageBody = JSON.stringify(params.data);

    await producer.send({
      id: params.groupId || params.name,
      body: messageBody,
      groupId: organizationId, // For fair queuing across organizations
    });

    const payloadSize = this.calculatePayloadSize(params.data);
    Logger.log(
      `Adding job to SQS queue. Topic: ${this.topic}, Job: ${params.name}, Payload size: ${payloadSize} bytes`,
      LOG_CONTEXT
    );
  }

  private extractOrganizationId(data: any): string | undefined {
    return data?._organizationId || data?.organizationId;
  }

  private extractEnvironmentId(data: any): string | undefined {
    return data?._environmentId || data?.environmentId;
  }

  public async addBulk(data: IBulkJobParams[]) {
    const payloadSizes = data.map((item) => this.calculatePayloadSize(item.data));
    const validSizes = payloadSizes.filter((size) => size >= 0);
    const totalPayloadSize = validSizes.reduce((sum, size) => sum + size, 0);
    const avgPayloadSize = validSizes.length > 0 ? Math.round(totalPayloadSize / validSizes.length) : 0;

    const failedSerializationCount = payloadSizes.length - validSizes.length;
    if (failedSerializationCount > 0) {
      Logger.warn(
        `Failed to serialize ${failedSerializationCount} out of ${data.length} items when calculating payload sizes`,
        LOG_CONTEXT
      );
    }

    Logger.log(
      `Adding bulk jobs to queue. Topic: ${this.topic}, Count: ${data.length}, Total payload size: ${totalPayloadSize} bytes, Avg payload size: ${avgPayloadSize} bytes`,
      LOG_CONTEXT
    );

    await this.bullMqService.addBulk(data);
  }

  private calculatePayloadSize(data: any): number {
    if (!data) return 0;

    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.warn(`Failed to calculate payload size: ${errorMessage}`, LOG_CONTEXT);

      return -1;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}

export interface IJobParams {
  name: string;
  data?: any;
  groupId?: string;
  options?: JobsOptions;
}

export interface IBulkJobParams {
  name: string;
  data: any;
  groupId?: string;
  options?: BulkJobOptions;
}
