import { Novu } from '@novu/api';
import { CreateWorkflowDto, WorkflowCreationSourceEnum } from '@novu/api/models/components';
import { ClickHouseService, PinoLogger, StepRunV2ReadRow, StepRunV2Repository } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum, SubscriberEntity } from '@novu/dal';
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
import { addSeconds, subDays } from 'date-fns';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { sleep } from './utils/sleep.util';

const IN_FLIGHT_STATUSES = [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING, JobStatusEnum.DELAYED];

/*
 * Requires ClickHouse and a worker started with IS_STEP_RUNS_V2_WRITE_ENABLED=true (set in the
 * worker and API .env.test). For every non-trigger job of a run, the latest step_runs_v2 row must
 * hold the status Mongo holds.
 */
describe('step_runs_v2 live writes #novu-v2', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let novuClient: Novu;
  const jobRepository = new JobRepository();
  const clickHouseService = new ClickHouseService();
  let stepRunV2Repository: StepRunV2Repository;

  before(async () => {
    await clickHouseService.init();
    const logger = { setContext: () => undefined, error: () => undefined } as unknown as PinoLogger;
    stepRunV2Repository = new StepRunV2Repository(clickHouseService, logger);
    await stepRunV2Repository.onModuleInit();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  async function findRunJobs(transactionIds: string[]): Promise<JobEntity[]> {
    return jobRepository.find({
      _environmentId: session.environment._id,
      transactionId: { $in: transactionIds },
      type: { $ne: StepTypeEnum.TRIGGER },
    });
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

  async function expectStepRunsV2ToMatchMongo(transactionIds: string[]) {
    const jobs = await findRunJobs(transactionIds);
    const expected = Object.fromEntries(jobs.map((job) => [String(job._id), job.status]));
    const workflowRunIds = Array.from(new Set(jobs.map((job) => String(job._notificationId))));
    let actual: Record<string, string> = {};
    let rows: StepRunV2ReadRow[] = [];
    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
      rows = await stepRunV2Repository.findByWorkflowRunIds({
        environmentId: session.environment._id,
        workflowRunIds,
        oldestRunCreatedAt: subDays(new Date(), 1),
        limit: 1000,
      });
      actual = Object.fromEntries(rows.map((row) => [row.step_run_id, row.status]));

      if (JSON.stringify(sortKeys(actual)) === JSON.stringify(sortKeys(expected))) {
        break;
      }

      await sleep(250);
    }

    expect(actual).to.deep.equal(expected);

    return { jobs, rows };
  }

  function sortKeys(record: Record<string, string>) {
    return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
  }

  async function trigger(workflowId: string, payload: Record<string, unknown> = {}): Promise<string> {
    const { result } = await novuClient.trigger({ workflowId, to: [subscriber.subscriberId], payload });

    return result.transactionId as string;
  }

  it('writes completed in-app and email steps', async () => {
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

    const transactionId = await trigger(template.triggers[0].identifier);
    await waitForJobs([transactionId], allTerminal);

    const { jobs } = await expectStepRunsV2ToMatchMongo([transactionId]);
    expect(jobs).to.have.length(2);
    expect(jobs.find((job) => job.type === StepTypeEnum.IN_APP)?.status).to.equal(JobStatusEnum.COMPLETED);
  });

  it('writes a completed delay step and the step after it', async () => {
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

    await expectStepRunsV2ToMatchMongo([transactionId]);
  });

  it('writes the master digest as completed and the merged runs as merged', async () => {
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

    const { jobs, rows } = await expectStepRunsV2ToMatchMongo(transactionIds);
    const digestJobs = jobs.filter((job) => job.type === StepTypeEnum.DIGEST);
    expect(digestJobs.map((job) => job.status)).to.have.members([
      JobStatusEnum.COMPLETED,
      JobStatusEnum.MERGED,
      JobStatusEnum.MERGED,
    ]);

    const masterDigest = digestJobs.find((job) => job.status === JobStatusEnum.COMPLETED);
    const masterRow = rows.find((row) => row.step_run_id === String(masterDigest?._id));
    expect(masterDigest?.digest?.events).to.have.length(3);
    expect(Number(masterRow?.digest_events_count)).to.equal(3);
  });

  it('writes a step skipped by its condition', async () => {
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

    await expectStepRunsV2ToMatchMongo([transactionId]);
  });

  it('writes the steps of a run canceled while delayed', async () => {
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
    await waitForJobs([transactionId], (jobs) => jobs.every((job) => job.status === JobStatusEnum.CANCELED));

    await expectStepRunsV2ToMatchMongo([transactionId]);
  });

  it('writes a failed step', async () => {
    const workflowBody: CreateWorkflowDto = {
      name: 'step-runs-v2 failed delay',
      workflowId: 'step-runs-v2-failed-delay',
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

    const { jobs } = await expectStepRunsV2ToMatchMongo([transactionId]);
    expect(jobs.find((job) => job.type === StepTypeEnum.DELAY)?.status).to.equal(JobStatusEnum.FAILED);
  });
});
