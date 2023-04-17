import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum, DigestUnitEnum } from '@novu/shared';
import { UserSession, SubscribersService } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';
import { EventsPerformanceService, StorageHelperService } from '@novu/application-generic';

import { WorkflowQueueService } from '../../services/workflow-queue.service';
import { SendMessage } from '../send-message/send-message.usecase';
import { QueueNextJob } from '../queue-next-job/queue-next-job.usecase';
import { RunJob } from '../run-job/run-job.usecase';

const axiosInstance = axios.create();
const performanceService = new EventsPerformanceService();

describe('Performance - Events', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let workflowQueueService: WorkflowQueueService;
  const messageRepository = new MessageRepository();
  let runJob: RunJob;

  const triggerEvent = async (payload): Promise<void> => {
    try {
      await axiosInstance.post(
        `${session.serverUrl}/v1/events/trigger`,
        {
          transactionId: uuid(),
          name: template.triggers[0].identifier,
          to: [subscriber.subscriberId],
          payload,
        },
        {
          headers: {
            authorization: `ApiKey ${session.apiKey}`,
          },
        }
      );
    } catch (error) {
      //console.log({ error });
    }
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    workflowQueueService = session.testServer?.getService(WorkflowQueueService);

    runJob = new RunJob(
      jobRepository,
      session.testServer?.getService(SendMessage),
      session.testServer?.getService(QueueNextJob),
      session.testServer?.getService(StorageHelperService)
    );

    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });
  });

  it('50 concurrent calls', async () => {
    const total = 50;
    let i = 1;
    const calls: Promise<void>[] = [];
    for (i; i <= total; i += 1) {
      calls.push(triggerEvent({ customVar: `concurrent-calls-${i}` }));
    }

    await Promise.all(calls);

    await session.awaitRunningJobs(template?._id, false, i);

    performanceService.publishResults();

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs.length).to.eql(total);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs.length).to.eql(total - 1);
  });

  it('50 sequential calls', async () => {
    const total = 50;
    let i = 1;
    for (i; i <= total; i += 1) {
      await triggerEvent({ customVar: `sequential-calls-${i}` });
    }

    await session.awaitRunningJobs(template?._id, false, i);

    performanceService.publishResults();

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs.length).to.eql(total);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs.length).to.eql(total - 1);
  });

  it('100 concurrent calls', async () => {
    const total = 100;
    let i = 1;
    const calls: Promise<void>[] = [];
    for (i; i <= total; i += 1) {
      calls.push(triggerEvent({ customVar: `concurrent-calls-${i}` }));
    }

    await Promise.all(calls);

    await session.awaitRunningJobs(template?._id, false, i);

    performanceService.publishResults();

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs.length).to.eql(total);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs.length).to.eql(total - 1);
  });

  it('100 sequential calls', async () => {
    const total = 100;
    let i = 1;
    for (i; i <= total; i += 1) {
      await triggerEvent({ customVar: `sequential-calls-${i}` });
    }

    await session.awaitRunningJobs(template?._id, false, i);

    performanceService.publishResults();

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs.length).to.eql(total);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs.length).to.eql(total - 1);
  });

  it('200 concurrent calls', async () => {
    const total = 200;
    let i = 1;
    const calls: Promise<void>[] = [];
    for (i; i <= total; i += 1) {
      calls.push(triggerEvent({ customVar: `concurrent-calls-${i}` }));
    }

    await Promise.all(calls);

    await session.awaitRunningJobs(template?._id, false, i);

    performanceService.publishResults();

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs.length).to.eql(total);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs.length).to.eql(total - 1);
  });

  it('200 sequential calls', async () => {
    const total = 200;
    let i = 1;
    for (i; i <= total; i += 1) {
      await triggerEvent({ customVar: `sequential-calls-${i}` });
    }

    await session.awaitRunningJobs(template?._id, false, i);

    performanceService.publishResults();

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs.length).to.eql(total);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs.length).to.eql(total - 1);
  });
});
