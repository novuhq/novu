import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { JobRepository, JobStatusEnum, MessageRepository, SubscriberEntity } from '@novu/dal';
import { DelayTypeEnum, DigestTypeEnum, DigestUnitEnum, JobTopicNameEnum, StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { addSeconds } from 'date-fns';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { pollForJobStatusChange } from './utils/poll-for-job-status-change.util';

describe('Trigger event - Delay triggered events - /v1/events/trigger (POST) #novu-v2', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;
  const jobRepository = new JobRepository();
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  it('should delay execution for the provided interval', async () => {
    const template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Not Delayed {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'Testing of User Name',
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const delayedJob = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DELAY,
      },
      timeout: 5000,
    });

    expect(delayedJob!.status).to.equal(JobStatusEnum.DELAYED);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('Not Delayed');

    await session.waitForJobCompletion(template?._id);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messagesAfter.length).to.equal(2);
  });

  it('should delay execution until the provided datetime', async () => {
    const template = await session.createTemplate({
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

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'Testing of User Name',
        sendAt: addSeconds(new Date(), 30),
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const delayedJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    expect(delayedJobs.length).to.eql(1);
  });

  it('should not include delayed event in digested sent message', async () => {
    const template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 0.1,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Event {{eventNumber}}. Digested Events {{step.events.length}}' as string,
        },
      ],
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        eventNumber: '1',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        eventNumber: '2',
      },
    });

    await session.waitForJobCompletion(template?._id);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages[0].content).to.include('Event ');
    expect(messages[0].content).to.include('Digested Events 2');
  });

  it('should send a single message for same exact scheduled delay', async () => {
    const template = await session.createTemplate({
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
            amount: 1,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Digested Events {{step.events.length}}' as string,
        },
      ],
    });

    const dateValue = addSeconds(new Date(), 1);

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        eventNumber: '1',
        sendAt: dateValue,
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        eventNumber: '2',
        sendAt: dateValue,
      },
    });

    await session.waitForJobCompletion(template?._id);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('Digested Events 2');
  });

  // TODO: Restore the test when the internal SDK is updated
  it.skip('should fail for missing or invalid path for scheduled delay', async () => {
    const template = await session.createTemplate({
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

    const { result: result1 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'Testing of User Name',
      },
    });

    expect(result1.error?.[0]).to.equal('payload is missing required key(s) and type(s): sendAt (ISO Date)');

    const { result: result2 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'Testing of User Name',
        sendAt: '20-09-2025',
      },
    });

    expect(result2.error?.[0]).to.equal('payload is missing required key(s) and type(s): sendAt (ISO Date)');
  });

  describe('Dynamic Delay', () => {
    it('should delay execution based on ISO-8601 timestamp from payload', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'Dynamic Delay ISO-8601 Test',
        workflowId: 'dynamic-delay-iso-test',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            name: 'Before delay',
            controlValues: {
              body: 'Before delay',
            },
          },
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: {
              type: DelayTypeEnum.DYNAMIC,
              dynamicKey: 'payload.scheduledTime',
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            name: 'After delay',
            controlValues: {
              body: 'After delay',
            },
          },
        ],
      };

      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      const futureTime = addSeconds(new Date(), 2);

      await novuClient.trigger({
        workflowId: workflow.workflowId,
        to: [subscriber.subscriberId],
        payload: {
          scheduledTime: futureTime.toISOString(),
        },
      });

      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();

      const delayedJob = await pollForJobStatusChange({
        jobRepository,
        query: {
          _environmentId: session.environment._id,
          _templateId: workflow._id,
          type: StepTypeEnum.DELAY,
        },
        timeout: 5000,
      });

      expect(delayedJob!.status).to.equal(JobStatusEnum.DELAYED);
      expect(delayedJob!.step.metadata).to.deep.include({
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.scheduledTime',
      });

      const messagesBefore = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: 'in_app' as any,
      });

      expect(messagesBefore.length).to.equal(1);
      expect(messagesBefore[0].content).to.include('Before delay');
    });

    it('should delay execution based on duration object from payload', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'Dynamic Delay Duration Test',
        workflowId: 'dynamic-delay-duration-test',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            name: 'Before delay',
            controlValues: {
              body: 'Before delay',
            },
          },
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: {
              type: DelayTypeEnum.DYNAMIC,
              dynamicKey: 'payload.delayWindow',
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            name: 'After delay',
            controlValues: {
              body: 'After delay',
            },
          },
        ],
      };

      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      await novuClient.trigger({
        workflowId: workflow.workflowId,
        to: [subscriber.subscriberId],
        payload: {
          delayWindow: {
            amount: 2,
            unit: 'seconds',
          },
        },
      });

      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();

      const delayedJob = await pollForJobStatusChange({
        jobRepository,
        query: {
          _environmentId: session.environment._id,
          _templateId: workflow._id,
          type: 'delay' as any,
        },
        timeout: 5000,
      });

      expect(delayedJob!.status).to.equal(JobStatusEnum.DELAYED);
      expect(delayedJob!.step.metadata).to.deep.include({
        type: DelayTypeEnum.DYNAMIC,
        dynamicKey: 'payload.delayWindow',
      });
    });

    it('should fail when dynamic key is missing from payload', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'Dynamic Delay Missing Key Test',
        workflowId: 'dynamic-delay-missing-key-test',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: {
              type: DelayTypeEnum.DYNAMIC,
              dynamicKey: 'payload.scheduledTime',
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            name: 'Should not be sent',
            controlValues: {
              body: 'Should not be sent',
            },
          },
        ],
      };

      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      await novuClient.trigger({
        workflowId: workflow.workflowId,
        to: [subscriber.subscriberId],
        payload: {
          otherField: 'value',
        },
      });

      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();

      const failedJob = await pollForJobStatusChange({
        jobRepository,
        query: {
          _environmentId: session.environment._id,
          _templateId: workflow._id,
          type: 'delay' as any,
        },
        timeout: 5000,
      });

      expect(failedJob!.status).to.equal(JobStatusEnum.FAILED);
      expect(failedJob!.error?.message).to.include('not found in payload');
    });

    it('should fail when dynamic delay timestamp is in the past', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'Dynamic Delay Past Time Test',
        workflowId: 'dynamic-delay-past-time-test',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: {
              type: DelayTypeEnum.DYNAMIC,
              dynamicKey: 'payload.scheduledTime',
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            name: 'Should not be sent',
            controlValues: {
              body: 'Should not be sent',
            },
          },
        ],
      };

      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      const pastTime = addSeconds(new Date(), -10);

      await novuClient.trigger({
        workflowId: workflow.workflowId,
        to: [subscriber.subscriberId],
        payload: {
          scheduledTime: pastTime.toISOString(),
        },
      });

      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();

      const failedJob = await pollForJobStatusChange({
        jobRepository,
        query: {
          _environmentId: session.environment._id,
          _templateId: workflow._id,
          type: 'delay' as any,
        },
        timeout: 5000,
      });

      expect(failedJob!.status).to.equal(JobStatusEnum.FAILED);
      expect(failedJob!.error?.message).to.include('must be a future date');
    });

    it('should fail when dynamic delay value has invalid format', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'Dynamic Delay Invalid Format Test',
        workflowId: 'dynamic-delay-invalid-format-test',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: {
              type: DelayTypeEnum.DYNAMIC,
              dynamicKey: 'payload.delayValue',
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            name: 'Should not be sent',
            controlValues: {
              body: 'Should not be sent',
            },
          },
        ],
      };

      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      await novuClient.trigger({
        workflowId: workflow.workflowId,
        to: [subscriber.subscriberId],
        payload: {
          delayValue: 'invalid-format',
        },
      });

      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();

      const failedJob = await pollForJobStatusChange({
        jobRepository,
        query: {
          _environmentId: session.environment._id,
          _templateId: workflow._id,
          type: 'delay' as any,
        },
        timeout: 5000,
      });

      expect(failedJob!.status).to.equal(JobStatusEnum.FAILED);
      expect(failedJob!.error?.message).to.include('not a valid format');
    });

    it('should support different time units in duration objects', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'Dynamic Delay Time Units Test',
        workflowId: 'dynamic-delay-time-units-test',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: {
              type: DelayTypeEnum.DYNAMIC,
              dynamicKey: 'payload.delayConfig',
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            name: 'Delayed message',
            controlValues: {
              body: 'Delayed message',
            },
          },
        ],
      };

      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      const units = ['seconds', 'minutes', 'hours'];

      for (const unit of units) {
        await novuClient.trigger({
          workflowId: workflow.workflowId,
          to: [subscriber.subscriberId],
          payload: {
            delayConfig: {
              amount: 1,
              unit,
            },
          },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();

      const delayedJobs = await jobRepository.find({
        _environmentId: session.environment._id,
        _templateId: workflow._id,
        type: 'delay' as any,
      });

      expect(delayedJobs.length).to.equal(3);
      delayedJobs.forEach((job) => {
        expect(job.status).to.equal(JobStatusEnum.DELAYED);
      });
    });

    it('should fail when duration object has invalid unit', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'Dynamic Delay Invalid Unit Test',
        workflowId: 'dynamic-delay-invalid-unit-test',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: {
              type: DelayTypeEnum.DYNAMIC,
              dynamicKey: 'payload.delayConfig',
            },
          },
          {
            type: StepTypeEnum.IN_APP,
            name: 'Should not be sent',
            controlValues: {
              body: 'Should not be sent',
            },
          },
        ],
      };

      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      await novuClient.trigger({
        workflowId: workflow.workflowId,
        to: [subscriber.subscriberId],
        payload: {
          delayConfig: {
            amount: 5,
            unit: 'invalid-unit',
          },
        },
      });

      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();

      const failedJob = await pollForJobStatusChange({
        jobRepository,
        query: {
          _environmentId: session.environment._id,
          _templateId: workflow._id,
          type: 'delay' as any,
        },
        timeout: 5000,
      });

      expect(failedJob!.status).to.equal(JobStatusEnum.FAILED);
      expect(failedJob!.error?.message).to.include('Invalid time unit');
    });
  });
});
