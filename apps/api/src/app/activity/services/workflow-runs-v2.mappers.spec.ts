import { BadRequestException } from '@nestjs/common';
import { StepRunV2ReadRow } from '@novu/application-generic';
import { DeliveryLifecycleStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';
import {
  buildStepDigest,
  decodeWorkflowRunsCursor,
  encodeWorkflowRunsCursor,
  groupStepRunsByWorkflowRunId,
  isFirstPageCursor,
  mapDeliveryEventToStatus,
  mapStatusFilters,
  mapWorkflowStatusEventToDto,
  parseDigestEvents,
} from './workflow-runs-v2.mappers';

const NOTIFICATION_ID = '6560d1d0e4b0a1b2c3d4e5f6';

function buildRow(overrides: Partial<StepRunV2ReadRow> = {}): StepRunV2ReadRow {
  return {
    workflow_run_id: NOTIFICATION_ID,
    step_run_id: '6560d1d0e4b0a1b2c3d4e600',
    step_id: 'step_1',
    step_identifier: 'digest-step',
    step_name: 'Digest',
    step_type: 'digest',
    status: 'completed',
    provider_id: '',
    wait_amount: 0,
    wait_unit: '',
    wait_type: '',
    wait_until: '1970-01-01 00:00:00.000',
    digest_events_count: 0,
    schedule_extensions_count: 0,
    created_at: '2026-11-05 10:00:00.000',
    updated_at: '2026-11-05 10:00:05.000',
    ...overrides,
  };
}

describe('workflow runs v2 mappers', () => {
  describe('mapWorkflowStatusEventToDto', () => {
    it('maps the terminal workflow status events', () => {
      expect(mapWorkflowStatusEventToDto('workflow_run_status_completed')).to.equal(WorkflowRunStatusDtoEnum.COMPLETED);
      expect(mapWorkflowStatusEventToDto('workflow_run_status_error')).to.equal(WorkflowRunStatusDtoEnum.ERROR);
    });

    it('maps a run with no terminal event to processing', () => {
      expect(mapWorkflowStatusEventToDto(undefined)).to.equal(WorkflowRunStatusDtoEnum.PROCESSING);
      expect(mapWorkflowStatusEventToDto(null)).to.equal(WorkflowRunStatusDtoEnum.PROCESSING);
    });
  });

  describe('mapDeliveryEventToStatus', () => {
    it('strips the workflow_run_delivery_ prefix', () => {
      expect(mapDeliveryEventToStatus('workflow_run_delivery_sent')).to.equal(DeliveryLifecycleStatusEnum.SENT);
      expect(mapDeliveryEventToStatus('workflow_run_delivery_delivered')).to.equal(
        DeliveryLifecycleStatusEnum.DELIVERED
      );
      expect(mapDeliveryEventToStatus('workflow_run_delivery_interacted')).to.equal(
        DeliveryLifecycleStatusEnum.INTERACTED
      );
      expect(mapDeliveryEventToStatus('workflow_run_delivery_skipped')).to.equal(DeliveryLifecycleStatusEnum.SKIPPED);
      expect(mapDeliveryEventToStatus('workflow_run_delivery_canceled')).to.equal(DeliveryLifecycleStatusEnum.CANCELED);
      expect(mapDeliveryEventToStatus('workflow_run_delivery_errored')).to.equal(DeliveryLifecycleStatusEnum.ERRORED);
      expect(mapDeliveryEventToStatus('workflow_run_delivery_merged')).to.equal(DeliveryLifecycleStatusEnum.MERGED);
    });

    it('defaults to pending when nothing was emitted', () => {
      expect(mapDeliveryEventToStatus(undefined)).to.equal(DeliveryLifecycleStatusEnum.PENDING);
      expect(mapDeliveryEventToStatus(null)).to.equal(DeliveryLifecycleStatusEnum.PENDING);
    });
  });

  describe('mapStatusFilters', () => {
    it('maps every dto status to a repository filter', () => {
      expect(
        mapStatusFilters([
          WorkflowRunStatusDtoEnum.PROCESSING,
          WorkflowRunStatusDtoEnum.COMPLETED,
          WorkflowRunStatusDtoEnum.ERROR,
        ])
      ).to.deep.equal(['processing', 'completed', 'error']);
    });

    it('returns undefined when no status is requested', () => {
      expect(mapStatusFilters(undefined)).to.equal(undefined);
      expect(mapStatusFilters([])).to.equal(undefined);
    });
  });

  describe('cursor', () => {
    it('round-trips a cursor', () => {
      const cursor = { created_at: '2026-11-05T10:00:00.000Z', workflow_run_id: NOTIFICATION_ID };

      expect(decodeWorkflowRunsCursor(encodeWorkflowRunsCursor(cursor))).to.deep.equal(cursor);
    });

    it('keeps the ClickHouse reader cursor shape', () => {
      const cursor = { created_at: '2026-11-05T10:00:00.000Z', workflow_run_id: NOTIFICATION_ID };

      expect(JSON.parse(Buffer.from(encodeWorkflowRunsCursor(cursor), 'base64').toString('utf-8'))).to.deep.equal(
        cursor
      );
    });

    it('recognizes the first page cursor', () => {
      const cursor = decodeWorkflowRunsCursor(
        encodeWorkflowRunsCursor({ created_at: new Date(0).toISOString(), workflow_run_id: '1' })
      );

      expect(isFirstPageCursor(cursor)).to.equal(true);
    });

    it('rejects malformed cursors', () => {
      const invalidCursors = [
        'not-base64-json',
        encodeWorkflowRunsCursor({ created_at: 'not-a-date', workflow_run_id: NOTIFICATION_ID }),
        encodeWorkflowRunsCursor({ created_at: '2026-11-05T10:00:00.000Z', workflow_run_id: 'not-an-object-id' }),
        Buffer.from(JSON.stringify({ created_at: '2026-11-05T10:00:00.000Z' })).toString('base64'),
      ];

      for (const cursor of invalidCursors) {
        expect(() => decodeWorkflowRunsCursor(cursor)).to.throw(BadRequestException);
      }
    });
  });

  describe('groupStepRunsByWorkflowRunId', () => {
    it('orders steps by created_at, then step_run_id', () => {
      const rows = [
        buildRow({ step_run_id: 'c', created_at: '2026-11-05 10:00:01.000' }),
        buildRow({ step_run_id: 'b', created_at: '2026-11-05 10:00:00.000' }),
        buildRow({ step_run_id: 'a', created_at: '2026-11-05 10:00:00.000' }),
        buildRow({ step_run_id: 'd', workflow_run_id: 'other_run' }),
      ];

      const grouped = groupStepRunsByWorkflowRunId(rows);

      expect(grouped.get(NOTIFICATION_ID)?.map((row) => row.step_run_id)).to.deep.equal(['a', 'b', 'c']);
      expect(grouped.get('other_run')?.map((row) => row.step_run_id)).to.deep.equal(['d']);
    });
  });

  describe('parseDigestEvents', () => {
    it('parses the digest_triggered raw data', () => {
      const events = [
        { _id: 'job_1', payload: { index: 0 } },
        { _id: 'job_2', payload: { index: 1 } },
      ];

      expect(parseDigestEvents(JSON.stringify(events))).to.deep.equal(events);
    });

    it('ignores raw data that is not an array of events', () => {
      expect(parseDigestEvents(undefined)).to.equal(undefined);
      expect(parseDigestEvents('')).to.equal(undefined);
      expect(parseDigestEvents('{"not":"an array"}')).to.equal(undefined);
      expect(parseDigestEvents('not json')).to.equal(undefined);
      expect(parseDigestEvents('[1, {"_id": "job_1"}, null]')).to.deep.equal([{ _id: 'job_1' }]);
    });
  });

  describe('buildStepDigest', () => {
    const events = [{ _id: 'job_1', payload: { index: 0 } }];

    it('builds a regular digest with amount, unit and events', () => {
      const row = buildRow({
        wait_type: 'regular',
        wait_amount: 2,
        wait_unit: 'seconds',
        wait_until: '2026-11-05 10:00:02.000',
      });

      expect(buildStepDigest(row, events)).to.deep.equal({ type: 'regular', amount: 2, unit: 'seconds', events });
    });

    it('builds a backoff digest', () => {
      const row = buildRow({ wait_type: 'backoff', wait_amount: 5, wait_unit: 'minutes' });

      expect(buildStepDigest(row, events)).to.deep.equal({ type: 'backoff', amount: 5, unit: 'minutes', events });
    });

    it('builds a timed digest with its until date', () => {
      const row = buildRow({ wait_type: 'timed', wait_until: '2026-11-06 09:00:00.000', status: 'delayed' });

      expect(buildStepDigest(row)).to.deep.equal({
        type: 'timed',
        timed: { untilDate: '2026-11-06T09:00:00.000Z' },
      });
    });

    it('builds a regular delay without events', () => {
      const row = buildRow({
        step_type: 'delay',
        wait_type: 'regular',
        wait_amount: 30,
        wait_unit: 'seconds',
        wait_until: '2026-11-05 10:00:30.000',
      });

      expect(buildStepDigest(row, events)).to.deep.equal({ type: 'regular', amount: 30, unit: 'seconds' });
    });

    it('builds a timed delay with its until date', () => {
      const row = buildRow({ step_type: 'delay', wait_type: 'timed', wait_until: '2026-11-06 09:00:00.000' });

      expect(buildStepDigest(row)).to.deep.equal({
        type: 'timed',
        timed: { untilDate: '2026-11-06T09:00:00.000Z' },
      });
    });

    it('omits the until date when it was never set', () => {
      const row = buildRow({ step_type: 'delay', wait_type: 'dynamic' });

      expect(buildStepDigest(row)).to.deep.equal({ type: 'dynamic' });
    });

    it('returns undefined for steps that do not wait', () => {
      expect(buildStepDigest(buildRow({ step_type: 'in_app', wait_type: 'regular' }))).to.equal(undefined);
    });

    it('defaults rows written without a wait type to regular, keeping amount and unit', () => {
      const row = buildRow({ wait_type: '', wait_amount: 1, wait_unit: 'minutes' });

      expect(buildStepDigest(row, events)).to.deep.equal({ type: 'regular', amount: 1, unit: 'minutes', events });
      expect(buildStepDigest(buildRow({ step_type: 'delay', wait_type: '' }))).to.deep.equal({ type: 'regular' });
    });
  });
});
