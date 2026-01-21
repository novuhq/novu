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

  private async routeByMode(
    jobs: IJobParams | IBulkJobParams | IBulkJobParams[],
    queueBackendMode: string,
    organizationId?: string
  ): Promise<void> {
    const isBulk = Array.isArray(jobs);
    const jobsArray = isBulk ? jobs : [jobs];
    const orgId = organizationId || this.extractOrganizationId(jobsArray[0].data) || 'unknown';

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
      return await this.addJobsToBullMQ(jobsArray, isBulk);
    }

    switch (queueBackendMode) {
      case QueueBackendMode.BULLMQ:
        return await this.addJobsToBullMQ(jobsArray, isBulk);

      case QueueBackendMode.SHADOW: {
        await this.addJobsToBullMQ(jobsArray, isBulk);
        try {
          // In shadow mode, SQS messages are marked for skip to prevent double processing
          const jobsWithSkip = jobsArray.map((job) => ({
            ...job,
            data: { ...job.data, skipProcessing: true },
          }));
          await this.addJobsToSQS(jobsWithSkip, orgId, isBulk);
        } catch (error) {
          if (this.logger) {
            this.logger.warn(
              { error: error instanceof Error ? error.message : String(error) },
              'SQS failed in shadow mode, but BullMQ job was added successfully'
            );
          }
        }
        break;
      }

      case QueueBackendMode.LIVE: {
        await this.addJobsToSQS(jobsArray, orgId, isBulk);
        const jobsWithSkip = jobsArray.map((job) => ({
          ...job,
          data: { ...job.data, skipProcessing: true },
        }));
        await this.addJobsToBullMQ(jobsWithSkip, isBulk);
        break;
      }

      case QueueBackendMode.COMPLETE:
        return await this.addJobsToSQS(jobsArray, orgId, isBulk);

      default:
        Logger.warn({ mode: queueBackendMode }, 'Unknown queue backend mode, falling back to BullMQ', LOG_CONTEXT);
        return await this.addJobsToBullMQ(jobsArray, isBulk);
    }
  }

  private async addJobsToBullMQ(jobs: (IJobParams | IBulkJobParams)[], isBulk: boolean): Promise<void> {
    if (!isBulk && jobs.length === 1) {
      await this.addToBullMQ(jobs[0] as IJobParams);
    } else {
      const bulkJobs = jobs.map((job) => ({
        name: job.name,
        data: job.data || {},
        groupId: job.groupId,
        options: job.options,
      }));
      await this.bullMqService.addBulk(bulkJobs);
    }
  }

  private async addJobsToSQS(
    jobs: (IJobParams | IBulkJobParams)[],
    organizationId: string,
    isBulk: boolean
  ): Promise<void> {
    if (!isBulk && jobs.length === 1) {
      await this.addToSQS(jobs[0] as IJobParams, organizationId);
    } else {
      const bulkJobs = jobs.map((job) => ({
        name: job.name,
        data: job.data || {},
        groupId: job.groupId,
        options: job.options,
      }));
      await this.addBulkToSQS(bulkJobs, organizationId);
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
    try {
      await this.sqsService.send(this.topic, {
        id: params.groupId || params.name,
        body: JSON.stringify(params.data),
        groupId: organizationId, // For fair queuing across organizations
      });

      const payloadSize = this.calculatePayloadSize(params.data);
      Logger.log(
        `Adding job to SQS queue. Topic: ${this.topic}, Job: ${params.name}, Payload size: ${payloadSize} bytes`,
        LOG_CONTEXT
      );
    } catch (error) {
      Logger.warn(
        { topic: this.topic, error: error instanceof Error ? error.message : String(error) },
        'No SQS producer configured, falling back to BullMQ',
        LOG_CONTEXT
      );
      return await this.addToBullMQ(params);
    }
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

    // Check if SQS services are configured for bulk operations
    if (!this.sqsService || !this.featureFlagsService || !this.organizationRepository) {
      Logger.log({ topic: this.topic, count: data.length }, 'SQS not configured for bulk, using BullMQ', LOG_CONTEXT);
      await this.bullMqService.addBulk(data);
      return;
    }

    // Separate jobs by whether they have delays
    const jobsWithDelay: IBulkJobParams[] = [];
    const jobsWithoutDelay: IBulkJobParams[] = [];

    for (const job of data) {
      const delay = job.options?.delay || 0;
      if (delay > 0) {
        jobsWithDelay.push(job);
      } else {
        jobsWithoutDelay.push(job);
      }
    }

    // Process delayed jobs through BullMQ
    if (jobsWithDelay.length > 0) {
      Logger.log(
        { topic: this.topic, count: jobsWithDelay.length },
        'Routing delayed jobs to BullMQ in bulk operation',
        LOG_CONTEXT
      );
      await this.bullMqService.addBulk(jobsWithDelay);
    }

    // Process non-delayed jobs through standard routing (which may use SQS)
    if (jobsWithoutDelay.length > 0) {
      await this.addBulkToSqsOrBullMq(jobsWithoutDelay);
    }
  }

  private async addBulkToSqsOrBullMq(data: IBulkJobParams[]) {
    // Group jobs by organization for feature flag evaluation
    const jobsByOrg = new Map<string, IBulkJobParams[]>();
    const jobsWithoutOrg: IBulkJobParams[] = [];

    for (const job of data) {
      const organizationId = this.extractOrganizationId(job.data);
      if (organizationId) {
        if (!jobsByOrg.has(organizationId)) {
          jobsByOrg.set(organizationId, []);
        }
        const orgJobs = jobsByOrg.get(organizationId);
        if (orgJobs) {
          orgJobs.push(job);
        }
      } else {
        jobsWithoutOrg.push(job);
      }
    }

    // Process jobs without org through BullMQ
    if (jobsWithoutOrg.length > 0) {
      Logger.log(
        { topic: this.topic, count: jobsWithoutOrg.length },
        'Routing jobs without organization ID to BullMQ',
        LOG_CONTEXT
      );
      await this.bullMqService.addBulk(jobsWithoutOrg);
    }

    // Process jobs by organization
    for (const [organizationId, jobs] of jobsByOrg.entries()) {
      const environmentId = this.extractEnvironmentId(jobs[0].data);
      if (!environmentId) {
        await this.bullMqService.addBulk(jobs);
        continue;
      }

      // Get organization for feature flag
      const organization = await this.organizationRepository.findOne({ _id: organizationId }, 'apiServiceLevel', {
        readPreference: 'secondaryPreferred',
      });

      if (!organization) {
        await this.bullMqService.addBulk(jobs);
        continue;
      }

      // Check feature flag
      const queueBackendMode = await this.featureFlagsService.getFlag<string>({
        key: FeatureFlagsKeysEnum.QUEUE_BACKEND_MODE,
        defaultValue: QueueBackendMode.BULLMQ,
        organization: { _id: organizationId, apiServiceLevel: organization.apiServiceLevel },
        environment: { _id: environmentId },
      });

      // Route based on unified mode routing
      await this.routeByMode(jobs, queueBackendMode, organizationId);
    }
  }

  protected async addBulkToSQS(jobs: IBulkJobParams[], organizationId: string) {
    try {
      // Convert jobs to SQS messages
      const messages = jobs.map((job) => ({
        id: job.groupId || job.name,
        body: JSON.stringify(job.data),
        groupId: organizationId, // For fair queuing across organizations
      }));

      await this.sqsService.sendBulk(this.topic, messages);
    } catch (error) {
      Logger.warn(
        { topic: this.topic, count: jobs.length, error: error instanceof Error ? error.message : String(error) },
        'Failed to send bulk to SQS, falling back to BullMQ',
        LOG_CONTEXT
      );
      await this.bullMqService.addBulk(jobs);
    }
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
