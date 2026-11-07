import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum } from '@novu/api/models/components';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  NotificationEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
} from '@novu/dal';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  EmailBlockTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
  SeverityLevelEnum,
  StepTypeEnum,
} from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { addSeconds, subHours, subMinutes } from 'date-fns';
import { sleep } from '../../events/e2e/utils/sleep.util';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';
import { GetWorkflowRunResponseDto } from '../dtos/workflow-run-response.dto';
import { GetWorkflowRunsDto, GetWorkflowRunsResponseDto } from '../dtos/workflow-runs-response.dto';

const IN_FLIGHT_STATUSES = [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING, JobStatusEnum.DELAYED];

/*
 * Requires ClickHouse and a worker started with IS_STEP_RUNS_V2_WRITE_ENABLED=true (set in the worker
 * and API .env.test). The read flag is switched on for the in-process API only.
 */
describe('Workflow runs read from step_runs_v2 - GET /v1/activity/workflow-runs #novu-v2', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let novuClient: Novu;
  const jobRepository = new JobRepository();
  const notificationRepository = new NotificationRepository();

  before(() => {
    process.env.IS_ACTIVITY_STEP_RUNS_V2_READ_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_ACTIVITY_STEP_RUNS_V2_READ_ENABLED;
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  async function listRuns(query: Record<string, unknown>): Promise<GetWorkflowRunsResponseDto> {
    const { body } = await session.testAgent.get('/v1/activity/workflow-runs').query(query).expect(200);

    return body;
  }

  async function getRun(workflowRunId: string): Promise<GetWorkflowRunResponseDto> {
    const { body } = await session.testAgent.get(`/v1/activity/workflow-runs/${workflowRunId}`).expect(200);

    return body.data;
  }

  async function trigger(workflowId: string, payload: Record<string, unknown> = {}): Promise<string> {
    const { result } = await novuClient.trigger({ workflowId, to: [subscriber.subscriberId], payload });

    return result.transactionId as string;
  }

  async function findRunJobs(transactionIds: string[]): Promise<JobEntity[]> {
    return jobRepository.find({ _environmentId: session.environment._id, transactionId: { $in: transactionIds } });
  }

  async function waitForJobs(
    transactionIds: string[],
    isSettled: (jobs: JobEntity[]) => boolean,
    timeoutMs = 20000
  ): Promise<JobEntity[]> {
    const deadline = Date.now() + timeoutMs;
    let jobs: JobEntity[] = [];

    while (Date.now() < deadline) {
      await session.waitForWorkflowQueueCompletion();
      await session.waitForSubscriberQueueCompletion();
      await session.waitForStandardQueueCompletion();
      jobs = await findRunJobs(transactionIds);

      if (jobs.length > 0 && isSettled(jobs)) {
        return jobs;
      }

      await sleep(200);
    }

    throw new Error(`Jobs did not settle: ${JSON.stringify(jobs.map((job) => [job.type, job.status]))}`);
  }

  const allTerminal = (jobs: JobEntity[]) => jobs.every((job) => !IN_FLIGHT_STATUSES.includes(job.status));

  function statusesById(steps: { stepRunId: string; status: string }[]): Record<string, string> {
    return Object.fromEntries(
      steps.map((step) => [step.stepRunId, step.status]).sort(([left], [right]) => left.localeCompare(right))
    );
  }

  function jobStatusesById(jobs: JobEntity[]): Record<string, string> {
    return Object.fromEntries(
      jobs.map((job) => [String(job._id), job.status]).sort(([left], [right]) => left.localeCompare(right))
    );
  }

  /** Polls until the list and detail steps of every run hold the statuses Mongo holds. */
  async function expectRunsToMatchMongo(transactionIds: string[]) {
    const jobs = await findRunJobs(transactionIds);
    const notifications: NotificationEntity[] = await notificationRepository.find({
      _environmentId: session.environment._id,
      transactionId: { $in: transactionIds },
    });
    const deadline = Date.now() + 10000;
    let listRunsById: Record<string, GetWorkflowRunsDto> = {};
    let details: GetWorkflowRunResponseDto[] = [];
    let isMatching = false;

    while (Date.now() < deadline && !isMatching) {
      const list = await listRuns({ transactionIds, limit: 100 });
      listRunsById = Object.fromEntries(list.data.map((run) => [run.id, run]));
      details = await Promise.all(notifications.map((notification) => getRun(notification._id)));

      isMatching = notifications.every((notification, index) => {
        const expected = jobStatusesById(jobs.filter((job) => String(job._notificationId) === notification._id));
        const listRun = listRunsById[notification._id];

        return (
          listRun !== undefined &&
          JSON.stringify(statusesById(listRun.steps)) === JSON.stringify(expected) &&
          JSON.stringify(statusesById(details[index].steps)) === JSON.stringify(expected)
        );
      });

      if (!isMatching) {
        await sleep(250);
      }
    }

    notifications.forEach((notification, index) => {
      const expected = jobStatusesById(jobs.filter((job) => String(job._notificationId) === notification._id));

      expect(statusesById(listRunsById[notification._id]?.steps ?? [])).to.deep.equal(expected);
      expect(statusesById(details[index].steps)).to.deep.equal(expected);
      expect(details[index].transactionId).to.equal(notification.transactionId);
      expect(details[index].subscriberId).to.equal(subscriber.subscriberId);
    });

    return { jobs, notifications, details, listRunsById };
  }

  async function waitForRunStatus(workflowRunId: string, status: WorkflowRunStatusDtoEnum) {
    const deadline = Date.now() + 10000;
    let run = await getRun(workflowRunId);

    while (run.status !== status && Date.now() < deadline) {
      await sleep(250);
      run = await getRun(workflowRunId);
    }

    expect(run.status).to.equal(status);

    return run;
  }

  describe('Step 2 scenarios', () => {
    it('reads completed in-app and email runs, including the trigger step', async () => {
      const template = await session.createTemplate({
        steps: [
          { type: StepTypeEnum.IN_APP, content: 'Hello {{firstName}}' },
          {
            type: StepTypeEnum.EMAIL,
            subject: 'Subject',
            content: [{ type: EmailBlockTypeEnum.TEXT, content: 'Hello' }],
          },
        ],
      });

      const transactionId = await trigger(template.triggers[0].identifier, { foo: 'bar' });
      await waitForJobs([transactionId], allTerminal);

      const { notifications, details } = await expectRunsToMatchMongo([transactionId]);
      expect(details[0].steps.map((step) => step.stepType)).to.deep.equal(['trigger', 'in_app', 'email']);
      expect(details[0].payload).to.deep.include({ foo: 'bar' });
      expect(details[0].workflowName).to.equal(template.name);
      expect(details[0].triggerIdentifier).to.equal(template.triggers[0].identifier);

      await waitForRunStatus(notifications[0]._id, WorkflowRunStatusDtoEnum.COMPLETED);
      const notification = await notificationRepository.findOne({
        _id: notifications[0]._id,
        _environmentId: session.environment._id,
      });
      const run = await getRun(notifications[0]._id);
      expect(notification?.lastEmittedDeliveryEvent).to.not.equal(undefined);
      expect(run.deliveryLifecycleStatus).to.equal(
        notification?.lastEmittedDeliveryEvent?.replace('workflow_run_delivery_', '')
      );
    });

    it('reads a delay step with its amount and unit', async () => {
      const template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.DELAY,
            content: '',
            metadata: { unit: DigestUnitEnum.SECONDS, amount: 1, type: DelayTypeEnum.REGULAR },
          },
          { type: StepTypeEnum.IN_APP, content: 'After delay' },
        ],
      });

      const transactionId = await trigger(template.triggers[0].identifier);
      await waitForJobs([transactionId], allTerminal);

      const { details } = await expectRunsToMatchMongo([transactionId]);
      const delayStep = details[0].steps.find((step) => step.stepType === StepTypeEnum.DELAY);
      expect(delayStep?.digest).to.deep.include({
        type: DelayTypeEnum.REGULAR,
        amount: 1,
        unit: DigestUnitEnum.SECONDS,
      });
    });

    it('reads the master digest with its events and the merged runs', async () => {
      const template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.DIGEST,
            content: '',
            metadata: { unit: DigestUnitEnum.SECONDS, amount: 2, type: DigestTypeEnum.REGULAR },
          },
          { type: StepTypeEnum.IN_APP, content: 'Digested {{step.events.length}}' },
        ],
      });

      const transactionIds: string[] = [];
      for (let index = 0; index < 3; index += 1) {
        transactionIds.push(await trigger(template.triggers[0].identifier, { index }));
      }
      await waitForJobs(transactionIds, allTerminal, 30000);

      const { jobs, details } = await expectRunsToMatchMongo(transactionIds);
      const masterDigest = jobs.find(
        (job) => job.type === StepTypeEnum.DIGEST && job.status === JobStatusEnum.COMPLETED
      );
      expect(masterDigest).to.not.equal(undefined);

      const mergedRuns = details.filter((run) => run.id !== String(masterDigest?._notificationId));
      expect(mergedRuns).to.have.length(2);
      for (const mergedRun of mergedRuns) {
        expect(mergedRun.digestedWorkflowRunId).to.equal(String(masterDigest?._notificationId));
      }

      const deadline = Date.now() + 10000;
      let masterRun = await getRun(String(masterDigest?._notificationId));
      let digestStep = masterRun.steps.find((step) => step.stepRunId === String(masterDigest?._id));
      while (!digestStep?.digest?.events?.length && Date.now() < deadline) {
        await sleep(250);
        masterRun = await getRun(String(masterDigest?._notificationId));
        digestStep = masterRun.steps.find((step) => step.stepRunId === String(masterDigest?._id));
      }

      expect(digestStep?.digest).to.deep.include({
        type: DigestTypeEnum.REGULAR,
        amount: 2,
        unit: DigestUnitEnum.SECONDS,
      });
      expect(digestStep?.digest?.events).to.have.length(3);
      expect(digestStep?.executionDetails.some((detail) => detail.detail === 'Digest triggered events')).to.equal(true);
    });

    it('reads a step skipped by its condition', async () => {
      const template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Only when run is true',
            filters: [
              {
                isNegated: false,
                type: 'GROUP',
                value: FieldLogicalOperatorEnum.AND,
                children: [
                  { field: 'run', value: 'true', operator: FieldOperatorEnum.EQUAL, on: FilterPartTypeEnum.PAYLOAD },
                ],
              },
            ],
          },
          {
            type: StepTypeEnum.EMAIL,
            subject: 'Subject',
            content: [{ type: EmailBlockTypeEnum.TEXT, content: 'Hello' }],
          },
        ],
      });

      const transactionId = await trigger(template.triggers[0].identifier, { run: 'false' });
      await waitForJobs([transactionId], allTerminal);

      await expectRunsToMatchMongo([transactionId]);
    });

    it('reads the steps of a run canceled while delayed', async () => {
      const template = await session.createTemplate({
        steps: [
          {
            type: StepTypeEnum.DELAY,
            content: '',
            metadata: { unit: DigestUnitEnum.SECONDS, amount: 30, type: DelayTypeEnum.REGULAR },
          },
          { type: StepTypeEnum.IN_APP, content: 'Never sent' },
        ],
      });

      const transactionId = await trigger(template.triggers[0].identifier);
      await waitForJobs([transactionId], (jobs) =>
        jobs.some((job) => job.type === StepTypeEnum.DELAY && job.status === JobStatusEnum.DELAYED)
      );

      await axios.delete(`${session.serverUrl}/v1/events/trigger/${transactionId}`, {
        headers: { authorization: `ApiKey ${session.apiKey}` },
      });
      await waitForJobs([transactionId], (jobs) =>
        jobs.filter((job) => job.type !== StepTypeEnum.TRIGGER).every((job) => job.status === JobStatusEnum.CANCELED)
      );

      await expectRunsToMatchMongo([transactionId]);
    });

    it('reads a failed step', async () => {
      const workflowBody: CreateWorkflowDto = {
        name: 'step-runs-v2 read failed delay',
        workflowId: 'step-runs-v2-read-failed-delay',
        source: WorkflowCreationSourceEnum.Dashboard,
        steps: [
          {
            type: StepTypeEnum.DELAY,
            name: 'Dynamic Delay',
            controlValues: { type: DelayTypeEnum.DYNAMIC, dynamicKey: 'payload.scheduledTime' },
          },
          { type: StepTypeEnum.IN_APP, name: 'Should not be sent', controlValues: { body: 'Should not be sent' } },
        ],
      };
      const createResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
      const workflow = createResponse.body.data;

      const transactionId = await trigger(workflow.workflowId, {
        scheduledTime: addSeconds(new Date(), -10).toISOString(),
      });
      await waitForJobs([transactionId], (jobs) =>
        jobs.some((job) => job.type === StepTypeEnum.DELAY && job.status === JobStatusEnum.FAILED)
      );

      const { details } = await expectRunsToMatchMongo([transactionId]);
      expect(details[0].steps.find((step) => step.stepType === StepTypeEnum.DELAY)?.status).to.equal('failed');
    });

    it('returns 404 for an unknown run', async () => {
      await session.testAgent.get(`/v1/activity/workflow-runs/${NotificationRepository.createObjectId()}`).expect(404);
      await session.testAgent.get('/v1/activity/workflow-runs/not-an-object-id').expect(404);
    });
  });

  describe('paging and filters', () => {
    let firstTemplate: NotificationTemplateEntity;
    let secondTemplate: NotificationTemplateEntity;
    let otherSubscriber: SubscriberEntity;

    beforeEach(async () => {
      firstTemplate = await session.createTemplate({
        steps: [{ type: StepTypeEnum.IN_APP, content: 'First' }],
      });
      secondTemplate = await session.createTemplate({
        steps: [{ type: StepTypeEnum.IN_APP, content: 'Second' }],
      });
      otherSubscriber = await new SubscribersService(
        session.organization._id,
        session.environment._id
      ).createSubscriber();
    });

    async function insertRuns(runs: Partial<NotificationEntity>[]): Promise<string[]> {
      const documents = await notificationRepository._model.insertMany(
        runs.map((run) => ({
          _id: NotificationRepository.createObjectId(),
          _templateId: firstTemplate._id,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          _subscriberId: subscriber._id,
          transactionId: NotificationRepository.createObjectId(),
          to: { subscriberId: subscriber.subscriberId },
          channels: [StepTypeEnum.IN_APP],
          topics: [],
          contextKeys: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...run,
        }))
      );

      return documents.map((document) => String(document._id));
    }

    it('pages across runs that share a createdAt, forwards and backwards', async () => {
      const createdAt = subMinutes(new Date(), 5).toISOString();
      const ids = await insertRuns(Array.from({ length: 5 }, () => ({ createdAt })));
      const expectedOrder = [...ids].sort().reverse();

      const firstPage = await listRuns({ limit: 2 });
      const secondPage = await listRuns({ limit: 2, cursor: firstPage.next });
      const thirdPage = await listRuns({ limit: 2, cursor: secondPage.next });

      expect(firstPage.data.map((run) => run.id)).to.deep.equal(expectedOrder.slice(0, 2));
      expect(secondPage.data.map((run) => run.id)).to.deep.equal(expectedOrder.slice(2, 4));
      expect(thirdPage.data.map((run) => run.id)).to.deep.equal(expectedOrder.slice(4));
      expect(firstPage.previous).to.equal(null);
      expect(thirdPage.next).to.equal(null);

      const backToFirstPage = await listRuns({ limit: 2, cursor: secondPage.previous });
      expect(backToFirstPage.data.map((run) => run.id)).to.deep.equal(expectedOrder.slice(0, 2));
      expect(backToFirstPage.previous).to.equal(null);

      const backToSecondPage = await listRuns({ limit: 2, cursor: thirdPage.previous });
      expect(backToSecondPage.data.map((run) => run.id)).to.deep.equal(expectedOrder.slice(2, 4));
    });

    it('rejects a malformed cursor', async () => {
      await session.testAgent.get('/v1/activity/workflow-runs').query({ cursor: 'page_2' }).expect(400);
    });

    it('applies every filter with v1 semantics', async () => {
      const [runA, runB, runC] = await insertRuns([
        {
          _templateId: firstTemplate._id,
          transactionId: 'txn-filter-a',
          channels: [StepTypeEnum.EMAIL],
          topics: [
            {
              _topicId: NotificationRepository.createObjectId(),
              topicKey: 'team-a',
              preferenceEvaluation: { subscriptionIdentifier: 'sub-a', result: true },
            },
          ],
          severity: SeverityLevelEnum.HIGH,
          contextKeys: ['tenant:acme'],
          lastEmittedWorkflowStatusEvent: 'workflow_run_status_completed',
          lastEmittedDeliveryEvent: 'workflow_run_delivery_delivered',
        },
        {
          _templateId: secondTemplate._id,
          _subscriberId: otherSubscriber._id,
          to: { subscriberId: otherSubscriber.subscriberId },
          transactionId: 'txn-filter-b',
          severity: SeverityLevelEnum.NONE,
          lastEmittedWorkflowStatusEvent: 'workflow_run_status_error',
          lastEmittedDeliveryEvent: 'workflow_run_delivery_errored',
        },
        {
          _subscriberId: otherSubscriber._id,
          to: { subscriberId: otherSubscriber.subscriberId },
          transactionId: 'txn-filter-c',
          channels: [StepTypeEnum.SMS],
          createdAt: subHours(new Date(), 2).toISOString(),
        },
      ]);

      const idsFor = async (query: Record<string, unknown>) =>
        (await listRuns({ limit: 100, ...query })).data.map((run) => run.id).sort();
      const sorted = (...ids: string[]) => [...ids].sort();

      expect(await idsFor({})).to.deep.equal(sorted(runA, runB, runC));
      expect(await idsFor({ workflowIds: [firstTemplate._id] })).to.deep.equal(sorted(runA, runC));
      expect(await idsFor({ workflowIds: [firstTemplate._id, secondTemplate._id] })).to.deep.equal(
        sorted(runA, runB, runC)
      );
      expect(await idsFor({ subscriberIds: [subscriber.subscriberId] })).to.deep.equal([runA]);
      expect(await idsFor({ subscriberIds: ['unknown-subscriber'] })).to.deep.equal([]);
      expect(await idsFor({ transactionIds: ['txn-filter-b'] })).to.deep.equal([runB]);
      expect(await idsFor({ channels: [StepTypeEnum.EMAIL] })).to.deep.equal([runA]);
      expect(await idsFor({ channels: [StepTypeEnum.EMAIL, StepTypeEnum.SMS] })).to.deep.equal(sorted(runA, runC));
      expect(await idsFor({ topicKey: 'team-a' })).to.deep.equal([runA]);
      expect(await idsFor({ topicKey: 'team' })).to.deep.equal([]);
      expect(await idsFor({ subscriptionId: 'sub-a' })).to.deep.equal([runA]);
      expect(await idsFor({ severity: [SeverityLevelEnum.HIGH] })).to.deep.equal([runA]);
      expect(await idsFor({ severity: [SeverityLevelEnum.NONE] })).to.deep.equal(sorted(runB, runC));
      expect(await idsFor({ contextKeys: ['tenant:acme'] })).to.deep.equal([runA]);
      expect(await idsFor({ statuses: [WorkflowRunStatusDtoEnum.COMPLETED] })).to.deep.equal([runA]);
      expect(await idsFor({ statuses: [WorkflowRunStatusDtoEnum.ERROR] })).to.deep.equal([runB]);
      expect(await idsFor({ statuses: [WorkflowRunStatusDtoEnum.PROCESSING] })).to.deep.equal([runC]);
      expect(
        await idsFor({ statuses: [WorkflowRunStatusDtoEnum.PROCESSING, WorkflowRunStatusDtoEnum.ERROR] })
      ).to.deep.equal(sorted(runB, runC));
      expect(await idsFor({ createdLte: subHours(new Date(), 1).toISOString() })).to.deep.equal([runC]);
      expect(await idsFor({ createdGte: subHours(new Date(), 1).toISOString() })).to.deep.equal(sorted(runA, runB));

      const list = await listRuns({ transactionIds: ['txn-filter-a', 'txn-filter-b'] });
      const listedA = list.data.find((run) => run.id === runA);
      const listedB = list.data.find((run) => run.id === runB);
      expect(listedA).to.deep.include({
        workflowName: firstTemplate.name,
        triggerIdentifier: firstTemplate.triggers[0].identifier,
        subscriberId: subscriber.subscriberId,
        status: WorkflowRunStatusDtoEnum.COMPLETED,
        deliveryLifecycleStatus: 'delivered',
        severity: SeverityLevelEnum.HIGH,
        contextKeys: ['tenant:acme'],
        steps: [],
      });
      expect(listedA?.topics?.[0]?.topicKey).to.equal('team-a');
      expect(listedB).to.deep.include({
        subscriberId: otherSubscriber.subscriberId,
        status: WorkflowRunStatusDtoEnum.ERROR,
        deliveryLifecycleStatus: 'errored',
      });
    });
  });
});
