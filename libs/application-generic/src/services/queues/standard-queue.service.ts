import { Injectable, Logger } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { CloudflareSchedulerMode, FeatureFlagsKeysEnum, JobTopicNameEnum } from '@novu/shared';
import { IStandardBulkJobDto, IStandardJobDto } from '../../dtos';
import { PinoLogger } from '../../logging';
import { BullMqService } from '../bull-mq';
import { CloudflareSchedulerService } from '../cloudflare-scheduler';
import { FeatureFlagsService } from '../feature-flags';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { QueueBaseService } from './queue-base.service';

const LOG_CONTEXT = 'StandardQueueService';

@Injectable()
export class StandardQueueService extends QueueBaseService {
  constructor(
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private cloudflareSchedulerService: CloudflareSchedulerService,
    private featureFlagsService: FeatureFlagsService,
    private organizationRepository: CommunityOrganizationRepository,
    private logger: PinoLogger
  ) {
    super(JobTopicNameEnum.STANDARD, new BullMqService(workflowInMemoryProviderService));

    Logger.log(`Creating queue ${this.topic}`, LOG_CONTEXT);

    this.createQueue();
    this.logger.setContext(LOG_CONTEXT);
  }

  public async add(data: IStandardJobDto) {
    const delay = data.options?.delay || 0;
    const hasDelay = delay > 0;

    if (!hasDelay) {
      return await super.add(data);
    }

    const organization = await this.organizationRepository.findOne(
      { _id: data.data._organizationId },
      'apiServiceLevel',
      { readPreference: 'secondaryPreferred' }
    );
    if (!organization) {
      throw new Error(`Organization ${data.data._organizationId} not found`);
    }

    const schedulerMode = await this.featureFlagsService.getFlag<string>({
      key: FeatureFlagsKeysEnum.CF_SCHEDULER_MODE,
      defaultValue: CloudflareSchedulerMode.OFF,
      organization: { _id: data.data._organizationId, apiServiceLevel: organization.apiServiceLevel },
      environment: { _id: data.data._environmentId },
    });

    const shouldUseCFScheduler = schedulerMode !== CloudflareSchedulerMode.OFF;

    this.logger.debug(
      {
        jobId: data.data._id,
        schedulerMode,
        shouldUseCFScheduler,
        delay,
        organizationId: data.data._organizationId,
        apiServiceLevel: organization.apiServiceLevel,
        environmentId: data.data._environmentId,
      },
      'CF Scheduler mode evaluation'
    );

    if (!shouldUseCFScheduler) {
      return await super.add(data);
    }

    await this.handleCFSchedulerMode(data, delay, schedulerMode);
  }

  public async addBulk(data: IStandardBulkJobDto[]) {
    return await super.addBulk(data);
  }

  private async handleCFSchedulerMode(originalData: IStandardJobDto, delay: number, mode: string) {
    const schedulerRequest = {
      jobId: originalData.data._id,
      scheduledFor: Date.now() + delay,
      mode,
      data: {
        _environmentId: originalData.data._environmentId,
        _id: originalData.data._id,
        _organizationId: originalData.data._organizationId,
        _userId: originalData.data._userId,
      },
    };

    switch (mode) {
      case 'shadow':
        this.logger.info(
          { jobId: originalData.data._id },
          'Shadow mode: BullMQ will process, CF Scheduler for validation'
        );

        await super.add(originalData);

        try {
          await this.cloudflareSchedulerService.scheduleJob(schedulerRequest);
        } catch (error) {
          this.logger.warn(
            { jobId: originalData.data._id, error: error instanceof Error ? error.message : String(error) },
            'CF Scheduler failed in shadow mode, but BullMQ job was added successfully'
          );
        }
        break;

      case 'live':
        this.logger.info({ jobId: originalData.data._id }, 'Live mode: CF Scheduler will process, BullMQ is shadow');

        await this.cloudflareSchedulerService.scheduleJob(schedulerRequest);

        await super.add({
          ...originalData,
          data: {
            ...originalData.data,
            skipProcessing: true,
          },
        });
        break;

      case 'complete':
        this.logger.info({ jobId: originalData.data._id }, 'Complete mode: Adding only to CF Scheduler');
        await this.cloudflareSchedulerService.scheduleJob(schedulerRequest);
        break;

      default:
        this.logger.warn({ mode }, 'Unknown CF Scheduler mode, falling back to BullMQ');
        await super.add(originalData);
    }
  }
}
