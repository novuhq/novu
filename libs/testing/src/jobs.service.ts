import { Queue } from 'bullmq';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { JobTopicNameEnum, StepTypeEnum } from '@novu/shared';

import { QueueService } from './queue.service';

export class JobsService {
  private jobRepository = new JobRepository();
  public triggerHandlerQueueService: QueueService;
  public triggerHandlerQueue: Queue;
  public jobQueue: QueueService;
  public subscriberProcessQueueService: QueueService;

  constructor() {
    this.triggerHandlerQueueService = new QueueService(JobTopicNameEnum.WORKFLOW);
    this.triggerHandlerQueue = this.triggerHandlerQueueService.queue;

    this.jobQueue = new QueueService(JobTopicNameEnum.STANDARD);

    this.subscriberProcessQueueService = new QueueService(JobTopicNameEnum.SUBSCRIBER_PROCESS);
  }

  public async awaitParsingEvents() {
    let waitingCount = 0;
    let parsedEvents = 0;
    do {
      waitingCount = await this.triggerHandlerQueue.getWaitingCount();
      parsedEvents = await this.triggerHandlerQueue.getActiveCount();
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

    let waitingCountSubscriberProcess = 0;
    let activeCountSubscriberProcess = 0;

    do {
      waitingCount = await this.triggerHandlerQueue.getWaitingCount();
      parsedEvents = await this.triggerHandlerQueue.getActiveCount();

      waitingCountJobs = await this.jobQueue.queue.getWaitingCount();
      activeCountJobs = await this.jobQueue.queue.getActiveCount();

      waitingCountSubscriberProcess = await this.subscriberProcessQueueService.queue.getWaitingCount();
      activeCountSubscriberProcess = await this.subscriberProcessQueueService.queue.getActiveCount();

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
      waitingCountSubscriberProcess > 0 ||
      activeCountSubscriberProcess > 0 ||
      runningJobs > unfinishedJobs
    );
  }
}
