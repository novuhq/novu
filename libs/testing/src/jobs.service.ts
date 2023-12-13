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
  public executionLogQueue: Queue;
  constructor(private isClusterMode?: boolean) {
    this.workflowQueue = new TestingQueueService(JobTopicNameEnum.WORKFLOW).queue;
    this.standardQueue = new TestingQueueService(JobTopicNameEnum.STANDARD).queue;
    this.subscriberProcessQueue = new TestingQueueService(JobTopicNameEnum.PROCESS_SUBSCRIBER).queue;
    this.executionLogQueue = new TestingQueueService(JobTopicNameEnum.EXECUTION_LOG).queue;
  }

  public async queueGet(jobTopicName: JobTopicNameEnum, getter: 'getDelayed') {
    let queue: Queue;

    switch (jobTopicName) {
      case JobTopicNameEnum.WORKFLOW:
        queue = this.workflowQueue;
        break;
      case JobTopicNameEnum.STANDARD:
        queue = this.standardQueue;
        break;
      case JobTopicNameEnum.PROCESS_SUBSCRIBER:
        queue = this.subscriberProcessQueue;
        break;
      default:
        throw new Error(`Invalid job topic name: ${jobTopicName}`);
    }

    switch (getter) {
      case 'getDelayed':
        return queue.getDelayed();
      default:
        throw new Error(`Invalid getter: ${getter}`);
    }
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

    return {
      getDelayedTimestamp: async () => {
        const delayedJobs = await this.standardQueue.getDelayed();

        if (delayedJobs.length === 1) {
          return delayedJobs[0].delay;
        } else {
          if (delayedJobs.length > 1) {
            throw new Error('There are more than one delayed jobs');
          } else if (delayedJobs.length === 0) {
            throw new Error('There are no delayed jobs');
          }
        }
      },
      runDelayedImmediately: async () => {
        const delayedJobs = await this.standardQueue.getDelayed();

        if (delayedJobs.length === 1) {
          await delayedJobs[0].changeDelay(1);
        } else {
          if (delayedJobs.length > 1) {
            throw new Error('There are more than one delayed jobs');
          } else if (delayedJobs.length === 0) {
            throw new Error('There are no delayed jobs');
          }
        }
      },
    };
  }

  private async getQueueMetric() {
    const [
      parsedEvents,
      waitingCount,
      waitingStandardJobsCount,
      activeStandardJobsCount,
      subscriberProcessQueueWaitingCount,
      subscriberProcessQueueActiveCount,
      executionLogQueueWaitingCount,
      executionLogQueueActiveCount,
    ] = await Promise.all([
      this.workflowQueue.getActiveCount(),
      this.workflowQueue.getWaitingCount(),

      this.standardQueue.getWaitingCount(),
      this.standardQueue.getActiveCount(),

      this.subscriberProcessQueue.getWaitingCount(),
      this.subscriberProcessQueue.getActiveCount(),

      this.executionLogQueue.getWaitingCount(),
      this.executionLogQueue.getActiveCount(),
    ]);

    const totalCount =
      parsedEvents +
      waitingCount +
      waitingStandardJobsCount +
      activeStandardJobsCount +
      subscriberProcessQueueWaitingCount +
      subscriberProcessQueueActiveCount +
      executionLogQueueWaitingCount +
      executionLogQueueActiveCount;

    return {
      totalCount,
      parsedEvents,
      waitingCount,
      waitingStandardJobsCount,
      activeStandardJobsCount,
      subscriberProcessQueueWaitingCount,
      subscriberProcessQueueActiveCount,
      executionLogQueueWaitingCount,
      executionLogQueueActiveCount,
    };
  }
}
