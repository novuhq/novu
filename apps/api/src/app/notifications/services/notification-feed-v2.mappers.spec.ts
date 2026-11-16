import { StepRunV2ReadRow } from '@novu/application-generic';
import { NotificationStepEntity } from '@novu/dal';
import { DigestTypeEnum, DigestUnitEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  groupStepRunsByWorkflowRunId,
  indexWorkflowSteps,
  mapStepRunToJob,
  parseDigestEvents,
  parseDigestMetadata,
  StepRunJobContext,
} from './notification-feed-v2.mappers';

function buildStepRow(overrides: Partial<StepRunV2ReadRow> = {}): StepRunV2ReadRow {
  return {
    workflow_run_id: 'run-1',
    step_run_id: 'job-1',
    step_id: 'step-1',
    step_identifier: 'in-app-step',
    step_name: 'In-App Step',
    step_type: 'in_app',
    status: 'completed',
    provider_id: 'novu',
    wait_amount: 0,
    wait_unit: '',
    wait_type: '',
    wait_until: '1970-01-01 00:00:00.000',
    digest_metadata: '',
    digest_events_count: 0,
    schedule_extensions_count: 0,
    created_at: '2026-11-05 10:00:00.000',
    updated_at: '2026-11-05 10:00:01.000',
    ...overrides,
  };
}

function buildContext(overrides: Partial<StepRunJobContext> = {}): StepRunJobContext {
  return {
    notification: { payload: { foo: 'bar' } },
    workflowStepsById: new Map(),
    tracesByStepRunId: new Map(),
    digestEventsByStepRunId: new Map(),
    ...overrides,
  };
}

describe('notification feed v2 mappers', () => {
  describe('mapStepRunToJob', () => {
    it('maps the step run onto the job shape with the workflow step and the notification payload', () => {
      const workflowStep: NotificationStepEntity = {
        _id: 'step-1',
        _templateId: 'message-template-1',
        name: 'Current name',
        active: true,
        filters: [],
      };

      const job = mapStepRunToJob(
        buildStepRow({ schedule_extensions_count: 2 }),
        buildContext({ workflowStepsById: new Map([['step-1', workflowStep]]) })
      );

      expect(job).to.deep.equal({
        _id: 'job-1',
        type: 'in_app',
        status: 'completed',
        providerId: 'novu',
        step: workflowStep,
        payload: { foo: 'bar' },
        digest: undefined,
        scheduleExtensionsCount: 2,
        createdAt: '2026-11-05T10:00:00.000Z',
        updatedAt: '2026-11-05T10:00:01.000Z',
        executionDetails: [],
      });
    });

    it('falls back to the step identity recorded on the row when the workflow no longer has the step', () => {
      const job = mapStepRunToJob(buildStepRow(), buildContext());

      expect(job.step).to.deep.equal({
        _id: 'step-1',
        _templateId: '',
        stepId: 'in-app-step',
        name: 'In-App Step',
        filters: [],
      });
    });

    it('rebuilds job.digest from digest_metadata and the digest_triggered events', () => {
      const metadata = {
        type: DigestTypeEnum.REGULAR,
        amount: 5,
        unit: DigestUnitEnum.MINUTES,
        digestKey: 'postId',
        backoff: true,
      };
      const events = [{ _id: 'event-1' }, { _id: 'event-2' }];

      const job = mapStepRunToJob(
        buildStepRow({ step_type: 'digest', digest_metadata: JSON.stringify(metadata) }),
        buildContext({ digestEventsByStepRunId: new Map([['job-1', events]]) })
      );

      expect(job.digest).to.deep.equal({ ...metadata, events });
    });

    it('maps traces to execution details with the step provider', () => {
      const job = mapStepRunToJob(
        buildStepRow(),
        buildContext({
          tracesByStepRunId: new Map([
            [
              'job-1',
              [
                {
                  entity_id: 'job-1',
                  id: 'trace-1',
                  status: 'error',
                  title: 'Message failed',
                  raw_data: '{"error":true}',
                  created_at: '2026-11-05 10:00:00.500' as unknown as Date,
                },
              ],
            ],
          ]),
        })
      );

      expect(job.executionDetails).to.deep.equal([
        {
          _id: 'trace-1',
          _jobId: 'job-1',
          providerId: 'novu',
          detail: 'Message failed',
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          createdAt: '2026-11-05T10:00:00.500Z',
          raw: '{"error":true}',
        },
      ]);
    });
  });

  describe('indexWorkflowSteps', () => {
    it('indexes steps and their variants by id', () => {
      const variant: NotificationStepEntity = { _id: 'variant-1', _templateId: 'message-template-2' };
      const step: NotificationStepEntity = { _id: 'step-1', _templateId: 'message-template-1', variants: [variant] };

      const index = indexWorkflowSteps([{ _id: 'workflow-1', steps: [step] }]);

      expect(index.get('step-1')).to.equal(step);
      expect(index.get('variant-1')).to.equal(variant);
    });
  });

  describe('groupStepRunsByWorkflowRunId', () => {
    it('groups rows per run in creation order', () => {
      const late = buildStepRow({ step_run_id: 'job-a', created_at: '2026-11-05 10:00:02.000' });
      const early = buildStepRow({ step_run_id: 'job-b', created_at: '2026-11-05 10:00:01.000' });
      const otherRun = buildStepRow({ workflow_run_id: 'run-2', step_run_id: 'job-c' });

      const grouped = groupStepRunsByWorkflowRunId([late, otherRun, early]);

      expect(grouped.get('run-1')?.map((row) => row.step_run_id)).to.deep.equal(['job-b', 'job-a']);
      expect(grouped.get('run-2')?.map((row) => row.step_run_id)).to.deep.equal(['job-c']);
    });
  });

  describe('parsing', () => {
    it('ignores empty or malformed digest metadata and events', () => {
      expect(parseDigestMetadata('')).to.equal(undefined);
      expect(parseDigestMetadata('not json')).to.equal(undefined);
      expect(parseDigestMetadata('[1]')).to.equal(undefined);
      expect(parseDigestEvents(undefined)).to.equal(undefined);
      expect(parseDigestEvents('{"a":1}')).to.equal(undefined);
      expect(parseDigestEvents('[{"a":1},2,null]')).to.deep.equal([{ a: 1 }]);
    });
  });
});
