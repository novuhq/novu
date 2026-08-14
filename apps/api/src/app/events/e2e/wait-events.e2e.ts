import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { JobRepository, JobStatusEnum, MessageRepository, SubscriberEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { pollForJobStatusChange } from './utils/poll-for-job-status-change.util';

describe('Trigger event - Wait step - /v1/events/trigger/:transactionId/resume (POST) #novu-v2', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let sibling: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;
  const jobRepository = new JobRepository();
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    sibling = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  async function createWaitWorkflow(workflowId: string, amount = 1, unit = 'hours') {
    const workflowBody = {
      name: workflowId,
      workflowId,
      active: true,
      source: WorkflowCreationSourceEnum.Dashboard,
      steps: [
        {
          type: StepTypeEnum.WAIT,
          name: 'Wait Step',
          stepId: 'await-answer',
          controlValues: {
            amount,
            unit,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          name: 'In-App Message',
          controlValues: {
            body: 'After wait {{payload.customVar}}',
          },
        },
      ],
    } as CreateWorkflowDto;

    const { result: workflow } = await novuClient.workflows.create(workflowBody);

    return workflow;
  }

  it('should expire a Wait and continue the chain', async () => {
    const workflow = await createWaitWorkflow('wait-expire-workflow', 1, 'seconds');

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: [subscriber.subscriberId],
      payload: { customVar: 'expired-path' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const waitJob = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: workflow.id,
        type: StepTypeEnum.WAIT,
      },
      timeout: 8000,
    });

    expect(waitJob).to.be.ok;
    expect([JobStatusEnum.DELAYED, JobStatusEnum.COMPLETED]).to.include(waitJob!.status);

    await session.waitForJobCompletion(workflow.id);

    const completedWait = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: workflow.id,
      type: StepTypeEnum.WAIT,
    });

    expect(completedWait?.status).to.equal(JobStatusEnum.COMPLETED);
    expect(completedWait?.stepOutput?.status).to.equal('expired');

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(1);
  });

  it('should resume only the scoped recipient and leave sibling fan-out DELAYED', async () => {
    const workflow = await createWaitWorkflow('wait-resume-scope-workflow', 1, 'hours');
    const transactionId = `wait-scope-${Date.now()}`;

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      transactionId,
      to: [subscriber.subscriberId, sibling.subscriberId],
      payload: { customVar: 'resume-path' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        transactionId,
        type: StepTypeEnum.WAIT,
        subscriberId: subscriber.subscriberId,
        status: JobStatusEnum.DELAYED,
      },
      timeout: 8000,
    });

    const resumeResponse = await session.testAgent.post(`/v1/events/trigger/${transactionId}/resume`).send({
      stepId: 'await-answer',
      to: { subscriberId: subscriber.subscriberId },
      data: { answer: 'yes' },
    });

    expect(resumeResponse.status).to.equal(200);
    expect(resumeResponse.body.data.resumed).to.equal(true);

    const resumedJob = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        transactionId,
        type: StepTypeEnum.WAIT,
        subscriberId: subscriber.subscriberId,
        status: JobStatusEnum.COMPLETED,
      },
      timeout: 8000,
    });

    expect(resumedJob?.status).to.equal(JobStatusEnum.COMPLETED);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      transactionId,
      type: StepTypeEnum.WAIT,
    });

    const resumed = jobs.find((job) => job.subscriberId === subscriber.subscriberId);
    const parked = jobs.find((job) => job.subscriberId === sibling.subscriberId);

    expect(resumed?.status).to.equal(JobStatusEnum.COMPLETED);
    expect(resumed?.stepOutput?.status).to.equal('resumed');
    expect(resumed?.stepOutput?.data).to.deep.equal({ answer: 'yes' });
    expect(parked?.status).to.equal(JobStatusEnum.DELAYED);

    const secondResume = await session.testAgent.post(`/v1/events/trigger/${transactionId}/resume`).send({
      stepId: 'await-answer',
      to: { subscriberId: subscriber.subscriberId },
    });

    expect(secondResume.status).to.equal(200);
    expect(secondResume.body.data.resumed).to.equal(false);
  });

  it('should reject resume without to', async () => {
    const response = await session.testAgent.post('/v1/events/trigger/missing-txn/resume').send({
      stepId: 'await-answer',
    });

    expect(response.status).to.equal(400);
  });

  it('should abort DELAYED Wait jobs on run cancel without a Wait result', async () => {
    const workflow = await createWaitWorkflow('wait-cancel-workflow', 1, 'hours');
    const transactionId = `wait-cancel-${Date.now()}`;

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      transactionId,
      to: [subscriber.subscriberId],
      payload: { customVar: 'cancel-path' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        transactionId,
        type: StepTypeEnum.WAIT,
        status: JobStatusEnum.DELAYED,
      },
      timeout: 8000,
    });

    const cancelResponse = await session.testAgent.delete(`/v1/events/trigger/${transactionId}`);
    expect(cancelResponse.status).to.equal(200);
    expect(cancelResponse.body.data).to.equal(true);

    const waitJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      transactionId,
      type: StepTypeEnum.WAIT,
    });

    expect(waitJob?.status).to.equal(JobStatusEnum.CANCELED);
    expect(waitJob?.stepOutput).to.equal(undefined);
  });
});
