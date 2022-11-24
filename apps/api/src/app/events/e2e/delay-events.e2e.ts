import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';

import { expect } from 'chai';
import { StepTypeEnum, DelayTypeEnum, DigestUnitEnum, DigestTypeEnum } from '@novu/shared';
import axios from 'axios';
import { WorkflowQueueService } from '../services/workflow.queue.service';
import { addSeconds, differenceInMilliseconds } from 'date-fns';
import { RunJob } from '../usecases/run-job/run-job.usecase';
import { SendMessage } from '../usecases/send-message/send-message.usecase';
import { QueueNextJob } from '../usecases/queue-next-job/queue-next-job.usecase';
import { RunJobCommand } from '../usecases/run-job/run-job.command';
import { StorageHelperService } from '../services/storage-helper-service/storage-helper.service';

const axiosInstance = axios.create();

describe('Trigger event - Delay triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let workflowQueueService: WorkflowQueueService;
  const messageRepository = new MessageRepository();
  let runJob: RunJob;

  const awaitRunningJobs = async (unfinishedJobs = 0) => {
    let runningJobs = 0;
    do {
      runningJobs = await jobRepository.count({
        _environmentId: session.environment._id,
        type: {
          $nin: [StepTypeEnum.DELAY],
        },
        _templateId: template._id,
        status: {
          $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
        },
      });
    } while (runningJobs > unfinishedJobs);
  };

  const triggerEvent = async (payload, transactionId?: string, overrides = {}) => {
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        transactionId,
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload,
        overrides,
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    workflowQueueService = session.testServer.getService(WorkflowQueueService);

    runJob = new RunJob(
      jobRepository,
      session.testServer.getService(SendMessage),
      session.testServer.getService(QueueNextJob),
      session.testServer.getService(StorageHelperService)
    );
  });

  it('should delay event for time interval', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Not Delayed {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(1);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    expect(delayedJob.status).to.equal(JobStatusEnum.DELAYED);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('Not Delayed');

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );
    await awaitRunningJobs(0);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messagesAfter.length).to.equal(2);
  });

  it('should override delay parameters', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent(
      {
        customVar: 'Testing of User Name',
      },
      id,
      { delay: { amount: 3, unit: DigestUnitEnum.SECONDS } }
    );
    await awaitRunningJobs(0);
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages.length).to.equal(1);
  });

  it('should delay for scheduled delay', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.SCHEDULED,
            delayPath: 'sendAt',
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
      sendAt: addSeconds(new Date(), 30),
    });
    await awaitRunningJobs(1);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    const diff = differenceInMilliseconds(new Date(delayedJob.payload.sendAt), new Date(delayedJob?.updatedAt));

    const delay = await workflowQueueService.queue.getDelayed();
    expect(delay[0].opts.delay).to.approximately(diff, 5);
  });

  it('should not include delayed event in digested sent message', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DelayTypeEnum.REGULAR,
          },
        },
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
          type: StepTypeEnum.SMS,
          content: 'Event {{eventNumber}}. Digested Events {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      eventNumber: '1',
    });

    await awaitRunningJobs(2);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    const digestedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await triggerEvent({
      eventNumber: '2',
    });

    await awaitRunningJobs(1);

    await runJob.execute(
      RunJobCommand.create({
        jobId: digestedJob._id,
        environmentId: digestedJob._environmentId,
        organizationId: digestedJob._organizationId,
        userId: digestedJob._userId,
      })
    );

    await awaitRunningJobs(1);
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages[0].content).to.include('Event 1');
    expect(messages[0].content).to.include('Digested Events 1');
  });

  it('should send a single message for same exact scheduled delay', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.SCHEDULED,
            delayPath: 'sendAt',
          },
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 3,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Digested Events {{step.events.length}}' as string,
        },
      ],
    });

    const dateValue = addSeconds(new Date(), 5);

    await triggerEvent({
      eventNumber: '1',
      sendAt: dateValue,
    });
    await triggerEvent({
      eventNumber: '2',
      sendAt: dateValue,
    });
    await awaitRunningJobs(1);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('Digested Events 2');
  });

  it('should fail for missing or invalid path for scheduled delay', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.SCHEDULED,
            delayPath: 'sendAt',
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    try {
      await triggerEvent({
        customVar: 'Testing of User Name',
      });
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.response.data.message).to.equal('payload is missing required key(s) and type(s): sendAt (ISO Date)');
    }

    try {
      await triggerEvent({
        customVar: 'Testing of User Name',
        sendAt: '20-09-2025',
      });
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.response.data.message).to.equal('payload is missing required key(s) and type(s): sendAt (ISO Date)');
    }
  });

  it('should be able to cancel delay', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent(
      {
        customVar: 'Testing of User Name',
      },
      id
    );

    await awaitRunningJobs(1);
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger/${id}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    let delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    const pendingJobs = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.PENDING,
      transactionId: id,
    });

    expect(pendingJobs).to.equal(1);

    delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
      transactionId: id,
    });
    expect(delayedJob.status).to.equal(JobStatusEnum.CANCELED);
  });
});
