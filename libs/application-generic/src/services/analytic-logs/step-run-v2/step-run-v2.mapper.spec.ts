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
    updatedAt: UPDATED_AT.toISOString(),
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
  it('maps job identity, step fields, status and timestamps from the document', () => {
    const row = mapJobToStepRunV2(buildJob({ status: JobStatusEnum.QUEUED }));

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

  it('accepts Date timestamps, as returned by non-lean Mongoose documents', () => {
    const row = mapJobToStepRunV2(buildJob({ updatedAt: UPDATED_AT as unknown as string }));

    expect(row.updated_at).toBe('2026-11-03T10:00:00.123');
    expect(row.version).toBe(UPDATED_AT.getTime());
  });

  it('uses createdAt as updatedAt for a freshly inserted job', () => {
    const row = mapJobToStepRunV2(buildJob({ updatedAt: undefined }));

    expect(row.updated_at).toBe('2026-11-03T09:59:00.000');
    expect(row.version).toBe(new Date('2026-11-03T09:59:00.000Z').getTime());
  });

  it('maps trigger jobs like any other step', () => {
    const row = mapJobToStepRunV2(
      buildJob({ type: StepTypeEnum.TRIGGER, providerId: undefined, status: JobStatusEnum.COMPLETED })
    );

    expect(row).toMatchObject({ step_type: 'trigger', status: 'completed', provider_id: '' });
  });

  it('adds the terminal offset to the version for terminal statuses only', () => {
    for (const status of [
      JobStatusEnum.COMPLETED,
      JobStatusEnum.FAILED,
      JobStatusEnum.CANCELED,
      JobStatusEnum.SKIPPED,
    ]) {
      expect(mapJobToStepRunV2(buildJob({ status })).version).toBe(UPDATED_AT.getTime() + TERMINAL_VERSION_OFFSET);
    }

    for (const status of [
      JobStatusEnum.PENDING,
      JobStatusEnum.QUEUED,
      JobStatusEnum.RUNNING,
      JobStatusEnum.DELAYED,
      JobStatusEnum.MERGED,
    ]) {
      expect(mapJobToStepRunV2(buildJob({ status })).version).toBe(UPDATED_AT.getTime());
    }
  });

  it('lets a promoted digest replace its earlier merged row', () => {
    const merged = mapJobToStepRunV2(buildJob({ status: JobStatusEnum.MERGED, updatedAt: '2026-11-03T10:00:00.000Z' }));
    const promoted = mapJobToStepRunV2(
      buildJob({ status: JobStatusEnum.DELAYED, updatedAt: '2026-11-03T10:00:05.000Z' })
    );

    expect(promoted.version).toBeGreaterThan(merged.version);
  });

  it('lets a terminal row beat an in-flight row whose clock runs ahead', () => {
    const terminalVersion = computeStepRunV2Version('completed', new Date('2026-11-03T10:00:00.000Z'));
    const aheadInFlightVersion = computeStepRunV2Version('running', new Date('2026-11-03T11:00:00.000Z'));

    expect(terminalVersion).toBeGreaterThan(aheadInFlightVersion);
    expect(Number.isSafeInteger(terminalVersion)).toBe(true);
  });

  it('maps wait fields for a regular digest from job.digest and the persisted waitUntil', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        status: JobStatusEnum.DELAYED,
        digest: { type: DigestTypeEnum.REGULAR, amount: 5, unit: DigestUnitEnum.MINUTES },
        waitUntil: '2026-11-03T10:05:00.123Z',
      })
    );

    expect(row).toMatchObject({
      step_type: 'digest',
      wait_amount: 5,
      wait_unit: 'minutes',
      wait_type: 'regular',
      wait_until: '2026-11-03T10:05:00.123',
    });
  });

  it('keeps the persisted waitUntil on rows written after the wait', () => {
    const job = buildJob({
      type: StepTypeEnum.DELAY,
      step: {
        _id: 'step-1',
        _templateId: 'message-template-1',
        metadata: { type: DelayTypeEnum.REGULAR, amount: 2, unit: DigestUnitEnum.HOURS },
      },
      waitUntil: '2026-11-03T12:00:00.000Z',
    });

    for (const status of [JobStatusEnum.RUNNING, JobStatusEnum.COMPLETED]) {
      expect(mapJobToStepRunV2({ ...job, status }).wait_until).toBe('2026-11-03T12:00:00.000');
    }
  });

  it('records the backoff digest type', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        digest: { type: DigestTypeEnum.BACKOFF, amount: 15, unit: DigestUnitEnum.SECONDS, backoff: true },
      })
    );

    expect(row.wait_type).toBe('backoff');
  });

  it('falls back to the step metadata type when the job digest has none', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        digest: { amount: 5, unit: DigestUnitEnum.MINUTES } as JobEntity['digest'],
        step: {
          _id: 'step-1',
          _templateId: 'message-template-1',
          name: 'Digest',
          metadata: { type: DigestTypeEnum.REGULAR, amount: 1, unit: DigestUnitEnum.HOURS },
        },
      })
    );

    expect(row).toMatchObject({ wait_type: 'regular', wait_amount: 5, wait_unit: 'minutes' });
  });

  it('reads bridge-resolved delay settings from step.metadata over the initial job.digest', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DELAY,
        digest: { type: DelayTypeEnum.REGULAR, amount: 1, unit: DigestUnitEnum.MINUTES },
        step: {
          _id: 'step-1',
          _templateId: 'message-template-1',
          name: 'Delay',
          metadata: { type: DelayTypeEnum.REGULAR, amount: 3, unit: DigestUnitEnum.HOURS },
        },
      })
    );

    expect(row).toMatchObject({ step_type: 'delay', wait_type: 'regular', wait_amount: 3, wait_unit: 'hours' });
  });

  it('keeps fractional wait amounts with their unit', () => {
    const delayRow = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DELAY,
        digest: { type: DelayTypeEnum.REGULAR, amount: 1.5, unit: DigestUnitEnum.HOURS },
      })
    );
    const digestRow = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        digest: { type: DigestTypeEnum.REGULAR, amount: 0.5, unit: DigestUnitEnum.MINUTES },
      })
    );

    expect(delayRow).toMatchObject({ wait_amount: 1.5, wait_unit: 'hours' });
    expect(digestRow).toMatchObject({ wait_amount: 0.5, wait_unit: 'minutes' });
  });

  it('stores zero for negative or non-finite wait amounts', () => {
    for (const amount of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const row = mapJobToStepRunV2(
        buildJob({
          type: StepTypeEnum.DELAY,
          digest: { type: DelayTypeEnum.REGULAR, amount, unit: DigestUnitEnum.HOURS },
        })
      );

      expect(row.wait_amount).toBe(0);
    }
  });

  it('reads the dynamic delay type from step.metadata', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DELAY,
        digest: { type: DelayTypeEnum.REGULAR, amount: 1, unit: DigestUnitEnum.MINUTES },
        step: {
          _id: 'step-1',
          _templateId: 'message-template-1',
          name: 'Delay',
          metadata: { type: DelayTypeEnum.DYNAMIC, dynamicKey: 'payload.sendAt' },
        },
      })
    );

    expect(row).toMatchObject({ wait_type: 'dynamic', wait_amount: 0, wait_unit: '' });
  });

  it('falls back to job.digest for a delay without step metadata', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DELAY,
        digest: { type: DelayTypeEnum.REGULAR, amount: 2, unit: DigestUnitEnum.HOURS },
      })
    );

    expect(row).toMatchObject({ wait_type: 'regular', wait_amount: 2, wait_unit: 'hours' });
  });

  it('uses the timed digest untilDate when no waitUntil is persisted', () => {
    const row = mapJobToStepRunV2(
      buildJob({
        type: StepTypeEnum.DIGEST,
        digest: { type: DigestTypeEnum.TIMED, timed: { untilDate: '2026-11-04T08:00:00.000Z' } },
      })
    );

    expect(row).toMatchObject({
      wait_amount: 0,
      wait_unit: '',
      wait_type: 'timed',
      wait_until: '2026-11-04T08:00:00.000',
    });
  });

  it('counts digest events only when a digest step completes', () => {
    const digest = { type: DigestTypeEnum.REGULAR, events: [{}, {}, {}] } as JobEntity['digest'];

    expect(
      mapJobToStepRunV2(buildJob({ type: StepTypeEnum.DIGEST, status: JobStatusEnum.RUNNING, digest }))
        .digest_events_count
    ).toBe(0);
    expect(
      mapJobToStepRunV2(buildJob({ type: StepTypeEnum.DIGEST, status: JobStatusEnum.COMPLETED, digest }))
        .digest_events_count
    ).toBe(3);
    expect(
      mapJobToStepRunV2(buildJob({ type: StepTypeEnum.DELAY, status: JobStatusEnum.COMPLETED, digest }))
        .digest_events_count
    ).toBe(0);
  });

  it('accepts an epoch-milliseconds string createdAt, as written by the snooze job', () => {
    const row = mapJobToStepRunV2(buildJob({ createdAt: String(Date.parse('2026-11-03T09:00:00.000Z')) }));

    expect(row.created_at).toBe('2026-11-03T09:00:00.000');
  });

  it('carries the schedule extensions count from the job', () => {
    const row = mapJobToStepRunV2(buildJob({ scheduleExtensionsCount: 4 }));

    expect(row.schedule_extensions_count).toBe(4);
  });
});
