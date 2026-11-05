import { JobEntity, JobStatusEnum } from '@novu/dal';
import { DelayTypeEnum, DigestTypeEnum, DigestUnitEnum, StepTypeEnum } from '@novu/shared';
import { computeStepRunV2Version, mapJobToStepRunV2 } from './step-run-v2.mapper';
import { TERMINAL_VERSION_OFFSET } from './step-run-v2.schema';

const UPDATED_AT = new Date('2026-11-03T10:00:00.123Z');

function buildJob(overrides: Partial<JobEntity> = {}): JobEntity {
  return {
    _id: 'job-1',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _notificationId: 'notification-1',
    _userId: 'user-1',
    _subscriberId: 'subscriber-1',
    _templateId: 'template-1',
    subscriberId: 'external-1',
    transactionId: 'tx-1',
    identifier: 'workflow',
    payload: {},
    status: JobStatusEnum.PENDING,
    type: StepTypeEnum.IN_APP,
    providerId: 'novu',
    createdAt: '2026-11-03T09:59:00.000Z',
    updatedAt: '2026-11-03T09:59:00.000Z',
    step: {
      _id: 'step-1',
      _templateId: 'message-template-1',
      stepId: 'in-app-step',
      name: 'In-App Step',
    },
    ...overrides,
  } as JobEntity;
}

describe('mapJobToStepRunV2', () => {
  it('maps job identity, step fields and timestamps', () => {
    const row = mapJobToStepRunV2(buildJob(), { status: JobStatusEnum.QUEUED, updatedAt: UPDATED_AT });

    expect(row).toEqual({
      environment_id: 'env-1',
      workflow_run_id: 'notification-1',
      step_run_id: 'job-1',
      step_id: 'step-1',
      step_identifier: 'in-app-step',
      step_name: 'In-App Step',
      step_type: 'in_app',
      status: 'queued',
      provider_id: 'novu',
      wait_amount: 0,
      wait_unit: '',
      wait_type: '',
      wait_until: '1970-01-01T00:00:00.000',
      digest_events_count: 0,
      schedule_extensions_count: 0,
      created_at: '2026-11-03T09:59:00.000',
      updated_at: '2026-11-03T10:00:00.123',
      version: UPDATED_AT.getTime(),
    });
  });

  it('maps trigger jobs like any other step', () => {
    const row = mapJobToStepRunV2(buildJob({ type: StepTypeEnum.TRIGGER, providerId: undefined }), {
      status: JobStatusEnum.COMPLETED,
      updatedAt: UPDATED_AT,
    });

    expect(row).toMatchObject({ step_type: 'trigger', status: 'completed', provider_id: '' });
  });

  it('adds the terminal offset to the version for terminal statuses only', () => {
    for (const status of [
      JobStatusEnum.COMPLETED,
      JobStatusEnum.FAILED,
      JobStatusEnum.CANCELED,
      JobStatusEnum.MERGED,
      JobStatusEnum.SKIPPED,
    ]) {
      const row = mapJobToStepRunV2(buildJob(), { status, updatedAt: UPDATED_AT });

      expect(row?.version).toBe(UPDATED_AT.getTime() + TERMINAL_VERSION_OFFSET);
    }

    for (const status of [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING, JobStatusEnum.DELAYED]) {
      const row = mapJobToStepRunV2(buildJob(), { status, updatedAt: UPDATED_AT });

      expect(row?.version).toBe(UPDATED_AT.getTime());
    }
  });

  it('lets a terminal row beat an in-flight row whose clock runs ahead', () => {
    const terminalVersion = computeStepRunV2Version('completed', new Date('2026-11-03T10:00:00.000Z'));
    const aheadInFlightVersion = computeStepRunV2Version('running', new Date('2026-11-03T11:00:00.000Z'));

    expect(terminalVersion).toBeGreaterThan(aheadInFlightVersion);
    expect(Number.isSafeInteger(terminalVersion)).toBe(true);
  });

  it('maps wait fields for a regular digest', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        digest: { type: DigestTypeEnum.REGULAR, amount: 5, unit: DigestUnitEnum.MINUTES },
      }),
      { status: JobStatusEnum.DELAYED, updatedAt: UPDATED_AT, waitUntil: new Date('2026-11-03T10:05:00.123Z') }
    );

    expect(row).toMatchObject({
      step_type: 'digest',
      wait_amount: 5,
      wait_unit: 'minutes',
      wait_type: 'regular',
      wait_until: '2026-11-03T10:05:00.123',
    });
  });

  it('records the backoff digest type', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        digest: { type: DigestTypeEnum.BACKOFF, amount: 15, unit: DigestUnitEnum.SECONDS, backoff: true },
      }),
      { status: JobStatusEnum.DELAYED, updatedAt: UPDATED_AT }
    );

    expect(row.wait_type).toBe('backoff');
  });

  it('falls back to the step metadata type when the job digest has none', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DELAY,
        step: {
          _id: 'step-1',
          _templateId: 'message-template-1',
          name: 'Delay',
          metadata: { type: DelayTypeEnum.DYNAMIC, dynamicKey: 'payload.sendAt' },
        },
      }),
      { status: JobStatusEnum.DELAYED, updatedAt: UPDATED_AT }
    );

    expect(row.wait_type).toBe('dynamic');
  });

  it('uses the timed digest untilDate when no waitUntil is passed', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        digest: { type: DigestTypeEnum.TIMED, timed: { untilDate: '2026-11-04T08:00:00.000Z' } },
      }),
      { status: JobStatusEnum.DELAYED, updatedAt: UPDATED_AT }
    );

    expect(row).toMatchObject({
      wait_amount: 0,
      wait_unit: '',
      wait_type: 'timed',
      wait_until: '2026-11-04T08:00:00.000',
    });
  });

  it('prefers the caller-resolved waitUntil for delay steps', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DELAY,
        digest: { type: DelayTypeEnum.REGULAR, amount: 2, unit: DigestUnitEnum.HOURS },
      }),
      { status: JobStatusEnum.DELAYED, updatedAt: UPDATED_AT, waitUntil: new Date('2026-11-03T12:00:00.000Z') }
    );

    expect(row).toMatchObject({
      step_type: 'delay',
      wait_amount: 2,
      wait_unit: 'hours',
      wait_until: '2026-11-03T12:00:00.000',
    });
  });

  it('sets digest_events_count only when the step completes', () => {
    const job = buildJob({ type: StepTypeEnum.DIGEST });

    expect(
      mapJobToStepRunV2(job, { status: JobStatusEnum.RUNNING, updatedAt: UPDATED_AT, digestEventsCount: 3 })
        ?.digest_events_count
    ).toBe(0);
    expect(
      mapJobToStepRunV2(job, { status: JobStatusEnum.COMPLETED, updatedAt: UPDATED_AT, digestEventsCount: 3 })
        ?.digest_events_count
    ).toBe(3);
  });

  it('accepts an epoch-milliseconds string createdAt, as written by the snooze job', () => {
    const row = mapJobToStepRunV2(buildJob({ createdAt: String(Date.parse('2026-11-03T09:00:00.000Z')) }), {
      status: JobStatusEnum.DELAYED,
      updatedAt: UPDATED_AT,
    });

    expect(row?.created_at).toBe('2026-11-03T09:00:00.000');
  });

  it('carries the schedule extensions count from the job', () => {
    const row = mapJobToStepRunV2(buildJob({ scheduleExtensionsCount: 4 }), {
      status: JobStatusEnum.DELAYED,
      updatedAt: UPDATED_AT,
    });

    expect(row?.schedule_extensions_count).toBe(4);
  });
});
