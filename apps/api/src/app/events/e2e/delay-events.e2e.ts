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
import { addSeconds, differenceInMilliseconds } from 'date-fns';

import { WorkflowQueueService } from '../services/workflow-queue/workflow.queue.service';

const axiosInstance = axios.create();

describe('Trigger event - Delay triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let workflowQueueService: WorkflowQueueService;
  const messageRepository = new MessageRepository();

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
    workflowQueueService = session?.testServer?.getService(WorkflowQueueService);
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
          type: StepTypeEnum.CHAT,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await session.awaitRunningJobs(template?._id, true, 1);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });
    //delay added to next job in the chain
    const queuedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.QUEUED,
    });

    expect(delayedJob).to.null;
    expect(queuedJob.type).to.equal(StepTypeEnum.CHAT);
    expect(queuedJob.delay).equal(5 * 60 * 1000);
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });
    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('Not Delayed');
    await workflowQueueService.promoteJob(queuedJob._id);
    await session.awaitRunningJobs(template?._id, true, 0);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
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
    await session.awaitRunningJobs(template?._id, true, 1);
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages.length).to.equal(0);
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
    await session.awaitRunningJobs(template?._id, true, 1);

    const queuedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.QUEUED,
    });

    expect(queuedJob.type).to.equal(StepTypeEnum.SMS);
    expect(queuedJob.delay).to.approximately(30000, 1000);
  });

  it('should test delays in digested flow', async function () {
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
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.CHAT,
          content: 'Event {{eventNumber}}. Digested Events {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      eventNumber: '1',
    });
    await session.awaitRunningJobs(template?._id, false, 1);

    const digestedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await triggerEvent({
      eventNumber: '2',
    });
    await session.awaitRunningJobs(template?._id, false, 1);
    await workflowQueueService.promoteJob(digestedJob._id);
    await session.awaitRunningJobs(template?._id, false, 1);
    const chatDBJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.CHAT,
    });
    const queueJob = await workflowQueueService.getJob(chatDBJob._id);
    expect(queueJob).not.null;
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
    await session.awaitRunningJobs(template?._id, false, 1);
    const digestedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });
    await workflowQueueService.promoteJob(digestedJob._id);
    await session.awaitRunningJobs(template?._id, false, 0);

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
          type: StepTypeEnum.SMS,
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

    await session.awaitRunningJobs(template?._id, true, 1);
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger/${id}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    let delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.SMS,
    });
    await workflowQueueService.promoteJob(delayedJob._id);
    await session.awaitRunningJobs(template?._id, true, 0);

    const pendingJobs = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.PENDING,
      transactionId: id,
    });

    expect(pendingJobs).to.equal(0);

    delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.SMS,
      transactionId: id,
    });
    expect(delayedJob.status).to.equal(JobStatusEnum.CANCELED);
  });
});
