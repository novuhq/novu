import { Queue } from 'bullmq';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { JobTopicNameEnum, StepTypeEnum } from '@novu/shared';

import { TestingQueueService } from './testing-queue.service';

const LOG_CONTEXT = 'TestingJobsService';

export class JobsService {
  private jobRepository = new JobRepository();

  public standardQueue: Queue;
  public workflowQueue: Queue;
  public subscriberProcessQueue: Queue;

  constructor(private isClusterMode?: boolean) {
    this.workflowQueue = new TestingQueueService(JobTopicNameEnum.WORKFLOW).queue;
    this.standardQueue = new TestingQueueService(JobTopicNameEnum.STANDARD).queue;
    this.subscriberProcessQueue = new TestingQueueService(JobTopicNameEnum.PROCESS_SUBSCRIBER).queue;
  }

  public async awaitParsingEvents() {
    let totalCount = 0;

    do {
      totalCount = (await this.getQueueMetric()).totalCount;
    } while (totalCount > 0);
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
    let totalCount = 0;

    do {
      totalCount = (await this.getQueueMetric()).totalCount;
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
    } while (totalCount > 0 || runningJobs > unfinishedJobs);
  }

  private async getQueueMetric() {
    const [
      parsedEvents,
      waitingCount,
      waitingStandardJobsCount,
      activeStandardJobsCount,
      subscriberProcessQueueWaitingCount,
      subscriberProcessQueueActiveCount,
    ] = await Promise.all([
      this.workflowQueue.getActiveCount(),
      this.workflowQueue.getWaitingCount(),

      this.standardQueue.getWaitingCount(),
      this.standardQueue.getActiveCount(),

      this.subscriberProcessQueue.getWaitingCount(),
      this.subscriberProcessQueue.getActiveCount(),
    ]);

    const totalCount =
      parsedEvents +
      waitingCount +
      waitingStandardJobsCount +
      activeStandardJobsCount +
      subscriberProcessQueueWaitingCount +
      subscriberProcessQueueActiveCount;

    return {
      totalCount,
      parsedEvents,
      waitingCount,
      waitingStandardJobsCount,
      activeStandardJobsCount,
      subscriberProcessQueueWaitingCount,
      subscriberProcessQueueActiveCount,
    };
  }
}
