import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { JobEntity, JobRepository, JobStatusEnum, NotificationRepository, SubscriberEntity } from '@novu/dal';
import {
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  EmailBlockTypeEnum,
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
  StepTypeEnum,
} from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { addSeconds } from 'date-fns';
import { sleep } from '../../events/e2e/utils/sleep.util';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { ActivityNotificationJobResponseDto, ActivityNotificationResponseDto } from '../dtos/activities-response.dto';

const READ_FLAG = 'IS_ACTIVITY_STEP_RUNS_V2_READ_ENABLED';
/** Cloud reads execution details from traces only; the flag-off read must do the same to compare them. */
const PRODUCTION_READ_FLAGS = ['IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED', 'IS_TRACE_LOGS_READ_ENABLED'] as const;
const IN_FLIGHT_STATUSES = [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING, JobStatusEnum.DELAYED];

/*
 * Requires ClickHouse and a worker started with IS_STEP_RUNS_V2_WRITE_ENABLED=true (set in the worker and API
 * .env.test). Every run is read twice from the in-process API: with the read flag off (jobs collection) and on
 * (step_runs_v2 + traces), and the two responses are compared.
 */
describe('Activity feed read without jobs - GET /v1/notifications #novu-v2', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let novuClient: Novu;
  let originalReadFlag: string | undefined;
  const originalProductionReadFlags: Record<string, string | undefined> = {};
  const jobRepository = new JobRepository();
  const notificationRepository = new NotificationRepository();

  before(() => {
    originalReadFlag = process.env[READ_FLAG];
    for (const flag of PRODUCTION_READ_FLAGS) {
      originalProductionReadFlags[flag] = process.env[flag];
      process.env[flag] = 'true';
    }
  });

  after(() => {
    for (const flag of PRODUCTION_READ_FLAGS) {
      if (originalProductionReadFlags[flag] === undefined) {
        delete process.env[flag];
      } else {
        process.env[flag] = originalProductionReadFlags[flag];
      }
    }
  });

  afterEach(() => {
    if (originalReadFlag === undefined) {
      delete process.env[READ_FLAG];
    } else {
      process.env[READ_FLAG] = originalReadFlag;
    }
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriber = await new SubscribersService(session.organization._id, session.environment._id).createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  async function withReadFlag<T>(enabled: boolean, read: () => Promise<T>): Promise<T> {
    if (enabled) {
      process.env[READ_FLAG] = 'true';
    } else {
      delete process.env[READ_FLAG];
    }

    return read();
  }

  async function getNotification(notificationId: string, v2: boolean): Promise<ActivityNotificationResponseDto> {
    return withReadFlag(v2, async () => {
      const { body } = await session.testAgent.get(`/v1/notifications/${notificationId}`).expect(200);

      return body.data;
    });
  }

  async function listNotifications(
    query: Record<string, unknown>,
    v2: boolean
  ): Promise<{ data: ActivityNotificationResponseDto[]; hasMore: boolean; page: number; pageSize: number }> {
    return withReadFlag(v2, async () => {
      const { body } = await session.testAgent.get('/v1/notifications').query(query).expect(200);

      return body.data && !Array.isArray(body.data) ? body.data : body;
    });
  }

  async function trigger(workflowId: string, payload: Record<string, unknown> = {}): Promise<string> {
    const { result } = await novuClient.trigger({ workflowId, to: [subscriber.subscriberId], payload });

    return result.transactionId as string;
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
      jobs = await jobRepository.find({
        _environmentId: session.environment._id,
        transactionId: { $in: transactionIds },
      });

      if (jobs.length > 0 && isSettled(jobs)) {
        return jobs;
      }

      await sleep(200);
    }

    throw new Error(`Jobs did not settle: ${JSON.stringify(jobs.map((job) => [job.type, job.status]))}`);
  }

  const allTerminal = (jobs: JobEntity[]) => jobs.every((job) => !IN_FLIGHT_STATUSES.includes(job.status));

  function withoutJobs(notification: ActivityNotificationResponseDto) {
    const { jobs: _jobs, ...rest } = notification;

    return rest;
  }

  /** Everything the jobs collection returned that step_runs_v2, the workflow and traces must reproduce. */
  /**
   * Everything the flag-off read returns for a job, except two documented differences:
   * - `step` is reduced to the identity step_runs_v2 records (id, name, type), so only that part is compared;
   * - `payload` is never set: Cloud runs payload dedup, so jobs carry none, but the test worker runs without it.
   */
  function comparableJob(job: ActivityNotificationJobResponseDto) {
    const { step, payload: _payload, ...rest } = job;

    return { ...rest, step: { _id: step._id, name: step.name, active: step.active, type: step.template?.type } };
  }

  function comparableJobs(jobs: ActivityNotificationJobResponseDto[] = []) {
    return jobs.map(comparableJob);
  }

  function expectJobsToMatch(
    v1Jobs: ActivityNotificationJobResponseDto[] = [],
    v2Jobs: ActivityNotificationJobResponseDto[] = []
  ) {
    expect(comparableJobs(v2Jobs)).to.deep.equal(comparableJobs(v1Jobs));
    for (const v2Job of v2Jobs) {
      expect(v2Job.payload).to.equal(undefined);
    }
  }

  /** Polls until the v2 read catches up with jobs and traces written asynchronously, then compares both in full. */
  async function expectParity(transactionIds: string[]) {
    const notifications = await notificationRepository.find({
      _environmentId: session.environment._id,
      transactionId: { $in: transactionIds },
    });
    const query = { transactionId: transactionIds, limit: 50 };
    const deadline = Date.now() + 15000;
    let v1Details: ActivityNotificationResponseDto[] = [];
    let v2Details: ActivityNotificationResponseDto[] = [];
    let v1List = await listNotifications(query, false);
    let v2List = await listNotifications(query, true);

    do {
      v1Details = await Promise.all(notifications.map((notification) => getNotification(notification._id, false)));
      v2Details = await Promise.all(notifications.map((notification) => getNotification(notification._id, true)));
      v1List = await listNotifications(query, false);
      v2List = await listNotifications(query, true);

      const isMatching =
        v1Details.every(
          (v1Detail, index) =>
            JSON.stringify(comparableJobs(v1Detail.jobs)) === JSON.stringify(comparableJobs(v2Details[index].jobs))
        ) &&
        JSON.stringify(v1List.data.map((item) => comparableJobs(item.jobs))) ===
          JSON.stringify(v2List.data.map((item) => comparableJobs(item.jobs)));
      if (isMatching) {
        break;
      }

      await sleep(250);
    } while (Date.now() < deadline);

    v1Details.forEach((v1Detail, index) => {
      expect(withoutJobs(v2Details[index])).to.deep.equal(withoutJobs(v1Detail));
      expectJobsToMatch(v1Detail.jobs, v2Details[index].jobs);
    });

    expect(v2List.data.map(withoutJobs)).to.deep.equal(v1List.data.map(withoutJobs));
    expect({ ...v2List, data: undefined }).to.deep.equal({ ...v1List, data: undefined });
    v1List.data.forEach((v1Item, index) => {
      expectJobsToMatch(v1Item.jobs, v2List.data[index].jobs);
    });

    return { v1Details, v2Details };
  }

  it('reads completed in-app and email steps with execution details', async () => {
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

    const { v2Details } = await expectParity([transactionId]);
    const v2Jobs = v2Details[0].jobs ?? [];
    expect(v2Jobs.map((job) => job.type)).to.deep.equal([StepTypeEnum.IN_APP, StepTypeEnum.EMAIL]);
    expect(v2Details[0].payload).to.deep.include({ foo: 'bar' });
    expect(v2Jobs.every((job) => job.step.template?.type === job.type)).to.equal(true);

    const deadline = Date.now() + 10000;
    let jobs = v2Jobs;
    while (jobs.some((job) => job.executionDetails.length === 0) && Date.now() < deadline) {
      await sleep(250);
      jobs = (await getNotification(v2Details[0]._id as string, true)).jobs ?? [];
    }
    expect(jobs.every((job) => job.executionDetails.length > 0)).to.equal(true);
  });

  it('reads a delay step with its settings', async () => {
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

    const { v2Details } = await expectParity([transactionId]);
    const delayJob = v2Details[0].jobs?.find((job) => job.type === StepTypeEnum.DELAY);
    expect(delayJob?.digest).to.deep.include({ amount: 1, unit: DigestUnitEnum.SECONDS });
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
    const jobs = await waitForJobs(transactionIds, allTerminal, 30000);
    const masterDigest = jobs.find((job) => job.type === StepTypeEnum.DIGEST && job.status === JobStatusEnum.COMPLETED);
    expect(masterDigest).to.not.equal(undefined);

    // digest_triggered traces can land after the jobs settle.
    const deadline = Date.now() + 10000;
    let masterDetail = await getNotification(String(masterDigest?._notificationId), true);
    const findDigestJob = () => masterDetail.jobs?.find((job) => job._id === String(masterDigest?._id));
    while (!findDigestJob()?.digest?.events?.length && Date.now() < deadline) {
      await sleep(250);
      masterDetail = await getNotification(String(masterDigest?._notificationId), true);
    }

    const { v2Details } = await expectParity(transactionIds);
    expect(findDigestJob()?.digest).to.deep.include({
      type: DigestTypeEnum.REGULAR,
      amount: 2,
      unit: DigestUnitEnum.SECONDS,
    });
    expect(findDigestJob()?.digest?.events).to.have.length(3);

    const mergedRuns = v2Details.filter((run) => run._id !== String(masterDigest?._notificationId));
    expect(mergedRuns).to.have.length(2);
    for (const mergedRun of mergedRuns) {
      expect(mergedRun._digestedNotificationId).to.equal(String(masterDigest?._notificationId));
    }
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

    await expectParity([transactionId]);
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

    await expectParity([transactionId]);
  });

  it('reads a failed step of a dashboard workflow', async () => {
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

    const { v2Details } = await expectParity([transactionId]);
    expect(v2Details[0].jobs?.find((job) => job.type === StepTypeEnum.DELAY)?.status).to.equal(JobStatusEnum.FAILED);
    expect(v2Details[0].jobs?.find((job) => job.type === StepTypeEnum.DELAY)?.step.name).to.equal('Dynamic Delay');
  });

  it('returns no jobs for a run without step_runs_v2 rows', async () => {
    const template = await session.createTemplate({ steps: [{ type: StepTypeEnum.IN_APP, content: 'Hi' }] });
    const [notification] = await notificationRepository._model.insertMany([
      {
        _id: NotificationRepository.createObjectId(),
        _templateId: template._id,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _subscriberId: subscriber._id,
        transactionId: NotificationRepository.createObjectId(),
        channels: [StepTypeEnum.IN_APP],
      },
    ]);

    const detail = await getNotification(String(notification._id), true);

    expect(detail.jobs).to.deep.equal([]);
    expect(detail.template?.name).to.equal(template.name);
    expect(detail.subscriber?.subscriberId).to.equal(subscriber.subscriberId);
  });

  it('answers unknown and invalid notification ids the way the jobs read does', async () => {
    for (const notificationId of [NotificationRepository.createObjectId(), 'not-an-object-id']) {
      const readStatus = (v2: boolean) =>
        withReadFlag(v2, async () => (await session.testAgent.get(`/v1/notifications/${notificationId}`)).status);
      const v1Status = await readStatus(false);

      expect(await readStatus(true)).to.equal(v1Status);
    }

    process.env[READ_FLAG] = 'true';
    await session.testAgent.get(`/v1/notifications/${NotificationRepository.createObjectId()}`).expect(404);
  });
});
