import { Queue } from 'bullmq';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { JobTopicNameEnum, StepTypeEnum } from '@novu/shared';

import { QueueService } from './queue.service';

export class JobsService {
  private jobRepository = new JobRepository();
  public queueService: QueueService;
  public queue: Queue;
  public jobQueue: QueueService;

  constructor() {
    this.queueService = new QueueService(JobTopicNameEnum.WORKFLOW);
    this.queue = this.queueService.queue;

    this.jobQueue = new QueueService(JobTopicNameEnum.STANDARD);
  }

  public async awaitParsingEvents() {
    let waitingCount = 0;
    let parsedEvents = 0;
    do {
      waitingCount = await this.queue.getWaitingCount();
      parsedEvents = await this.queue.getActiveCount();
    } while (parsedEvents > 0 || waitingCount > 0);
  }

  public async awaitRunningJobs({
    templateId,
    organizationId,
    delay,
    unfinishedJobs = 0,
  }: {
    templateId?: string | string[];
    organizationId: string;
    delay?: boolean;
    unfinishedJobs?: number;
  }) {
    let runningJobs = 0;
    let waitingCount = 0;
    let parsedEvents = 0;

    let waitingCountJobs = 0;
    let activeCountJobs = 0;

    do {
      waitingCount = await this.queue.getWaitingCount();
      parsedEvents = await this.queue.getActiveCount();

      waitingCountJobs = await this.jobQueue.queue.getWaitingCount();
      activeCountJobs = await this.jobQueue.queue.getActiveCount();

      runningJobs = await this.jobRepository.count({
        _organizationId: organizationId,
        type: {
          $nin: [delay ? StepTypeEnum.DELAY : StepTypeEnum.DIGEST],
        },
        _templateId: Array.isArray(templateId) ? { $in: templateId } : templateId,
        status: {
          $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
        },
      });
    } while (
      waitingCountJobs > 0 ||
      activeCountJobs > 0 ||
      parsedEvents > 0 ||
      waitingCount > 0 ||
      runningJobs > unfinishedJobs
    );
  }
}
