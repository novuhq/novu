import { expect } from 'chai';
import { PinoLogger } from 'nestjs-pino';
import sinon from 'sinon';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { WorkflowRunCountRepository } from './workflow-run-count.repository';

describe('WorkflowRunCountRepository', () => {
  let repository: WorkflowRunCountRepository;
  let queryStub: sinon.SinonStub;
  let logger: Pick<PinoLogger, 'setContext' | 'debug' | 'info' | 'warn' | 'error'>;

  beforeEach(() => {
    queryStub = sinon.stub();

    logger = {
      setContext: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const query: ClickHouseService['query'] = (options) => queryStub(options);

    repository = new WorkflowRunCountRepository(
      { query } as ClickHouseService,
      logger as PinoLogger,
      {} as FeatureFlagsService
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getPlatformUsageByDateRange', () => {
    it('queries workflow_run_count for processing events and returns rows', async () => {
      const startDate = new Date('2024-01-01T12:34:56.000Z');
      const endDate = new Date('2024-01-31T23:59:59.000Z');
      const rows = [
        { organization_id: 'org-a', count: '10' },
        { organization_id: 'org-b', count: '25' },
      ];

      queryStub.resolves({ data: rows });

      const result = await repository.getPlatformUsageByDateRange(startDate, endDate);

      expect(result).to.deep.equal(rows);
      expect(queryStub.calledOnce).to.equal(true);

      const call = queryStub.firstCall.args[0];
      expect(call.query).to.include('FROM workflow_run_count');
      expect(call.query).to.include("event_type = 'workflow_run_status_processing'");
      expect(call.query).to.include('date >= {startDate:Date}');
      expect(call.query).to.include('date <= {endDate:Date}');
      expect(call.query).to.include('sum(count) as count');
      expect(call.query).to.include('GROUP BY organization_id');
      expect(call.query).to.include('ORDER BY organization_id');
      expect(call.params).to.deep.equal({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(call.query).to.not.include('organization_id = {organizationId:String}');
      expect(call.params).to.not.have.property('organizationId');
    });

    it('maps a midnight exclusive endDate to the previous calendar day', async () => {
      queryStub.resolves({ data: [{ organization_id: 'org-a', count: '3' }] });

      await repository.getPlatformUsageByDateRange(
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-02-01T00:00:00.000Z')
      );

      expect(queryStub.firstCall.args[0].params).to.deep.equal({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('adds organization_id filter and param when organizationId is provided', async () => {
      const startDate = new Date('2024-02-01T00:00:00.000Z');
      // Half-open end at start of March → last included day is Feb 29 2024
      const endDate = new Date('2024-03-01T00:00:00.000Z');
      const rows = [{ organization_id: 'org-only', count: '7' }];

      queryStub.resolves({ data: rows });

      const result = await repository.getPlatformUsageByDateRange(startDate, endDate, 'org-only');

      expect(result).to.deep.equal(rows);

      const call = queryStub.firstCall.args[0];
      expect(call.query).to.include('organization_id = {organizationId:String}');
      expect(call.params).to.deep.equal({
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        organizationId: 'org-only',
      });
    });

    it('returns an empty array when ClickHouse has no rows', async () => {
      queryStub.resolves({ data: [] });

      const result = await repository.getPlatformUsageByDateRange(
        new Date('2024-03-01T00:00:00.000Z'),
        new Date('2024-04-01T00:00:00.000Z')
      );

      expect(result).to.deep.equal([]);
    });
  });

  describe('getOrganizationUsageByDateRange', () => {
    const respondTo = (
      rollup: { total: string; start_day: string; end_day: string } | null,
      outside: { start_outside: string; end_outside: string }
    ) => {
      queryStub.callsFake(async ({ query }: { query: string }) => {
        if (query.includes('FROM traces')) {
          return { data: [outside] };
        }

        return { data: rollup === null ? [] : [rollup] };
      });
    };

    it('subtracts each edge day outside traces from that day rollup and keeps the interior', async () => {
      respondTo({ total: '100', start_day: '40', end_day: '25' }, { start_outside: '15', end_outside: '5' });

      const result = await repository.getOrganizationUsageByDateRange(
        'org-a',
        new Date('2026-09-30T15:06:44.000Z'),
        new Date('2026-10-30T15:06:44.000Z')
      );

      expect(result).to.equal(80);
      expect(queryStub.calledTwice).to.equal(true);

      const wholeDayCall = queryStub.getCalls().find((call) => call.args[0].query.includes('FROM workflow_run_count'));
      expect(wholeDayCall?.args[0].query).to.include('sumIf(count, date = {startDate:Date}) as start_day');
      expect(wholeDayCall?.args[0].query).to.include('sumIf(count, date = {endDate:Date}) as end_day');
      expect(wholeDayCall?.args[0].params).to.deep.equal({
        startDate: '2026-09-30',
        endDate: '2026-10-30',
        organizationId: 'org-a',
      });

      const tracesCall = queryStub.getCalls().find((call) => call.args[0].query.includes('FROM traces'));
      expect(tracesCall?.args[0].query).to.include('organization_id = {organizationId:String}');
      expect(tracesCall?.args[0].query).to.include("entity_type = 'workflow_run'");
      expect(tracesCall?.args[0].query).to.include("event_type = 'workflow_run_status_processing'");
      expect(tracesCall?.args[0].query).to.include(
        'countIf(created_at >= {startDayStart:DateTime64(3)} AND created_at < {startDate:DateTime64(3)}) as start_outside'
      );
      expect(tracesCall?.args[0].query).to.include(
        'countIf(created_at >= {endDate:DateTime64(3)} AND created_at < {endDayEnd:DateTime64(3)}) as end_outside'
      );
      expect(tracesCall?.args[0].params).to.deep.equal({
        organizationId: 'org-a',
        startDayStart: '2026-09-30T00:00:00.000',
        startDate: '2026-09-30T15:06:44.000',
        endDate: '2026-10-30T15:06:44.000',
        endDayEnd: '2026-10-31T00:00:00.000',
      });
    });

    it('bounds the last day by the day before a midnight exclusive end', async () => {
      respondTo({ total: '4', start_day: '3', end_day: '1' }, { start_outside: '1', end_outside: '0' });

      await repository.getOrganizationUsageByDateRange(
        'org-a',
        new Date('2026-09-30T15:06:44.000Z'),
        new Date('2026-10-30T00:00:00.000Z')
      );

      const tracesCall = queryStub.getCalls().find((call) => call.args[0].query.includes('FROM traces'));
      expect(tracesCall?.args[0].params).to.deep.include({
        endDate: '2026-10-30T00:00:00.000',
        endDayEnd: '2026-10-30T00:00:00.000',
      });

      const wholeDayCall = queryStub.getCalls().find((call) => call.args[0].query.includes('FROM workflow_run_count'));
      expect(wholeDayCall?.args[0].params).to.deep.include({
        startDate: '2026-09-30',
        endDate: '2026-10-29',
      });
    });

    it('clamps both outside slices against the single UTC day they share', async () => {
      respondTo({ total: '40', start_day: '40', end_day: '40' }, { start_outside: '5', end_outside: '8' });

      const result = await repository.getOrganizationUsageByDateRange(
        'org-a',
        new Date('2026-09-30T10:00:00.000Z'),
        new Date('2026-09-30T18:00:00.000Z')
      );

      expect(result).to.equal(27);
    });

    it('returns the rollup total without querying traces when the range is whole UTC days', async () => {
      queryStub.resolves({ data: [{ total: '42', start_day: '1', end_day: '2' }] });

      const result = await repository.getOrganizationUsageByDateRange(
        'org-a',
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-10-01T00:00:00.000Z')
      );

      expect(result).to.equal(42);
      expect(queryStub.calledOnce).to.equal(true);
      expect(queryStub.firstCall.args[0].query).to.include('FROM workflow_run_count');
    });

    it('returns 0 when the organization has no rollup rows', async () => {
      respondTo(null, { start_outside: '12', end_outside: '4' });

      const result = await repository.getOrganizationUsageByDateRange(
        'org-a',
        new Date('2026-09-30T15:06:44.000Z'),
        new Date('2026-10-30T15:06:44.000Z')
      );

      expect(result).to.equal(0);
    });

    it('clamps a disagreeing edge day and keeps the days fully inside the range', async () => {
      respondTo({ total: '100', start_day: '10', end_day: '20' }, { start_outside: '12', end_outside: '4' });

      const result = await repository.getOrganizationUsageByDateRange(
        'org-a',
        new Date('2026-09-30T15:06:44.000Z'),
        new Date('2026-10-30T15:06:44.000Z')
      );

      expect(result).to.equal(86);
    });
  });

  describe('getPlatformDailyUsageByDateRange', () => {
    it('queries daily processing rows for every organization when no minimum is provided', async () => {
      const startDate = new Date('2024-01-01T12:34:56.000Z');
      const endDate = new Date('2024-01-31T23:59:59.000Z');
      const rows = [
        { organization_id: 'org-a', day: '2024-01-01', count: '10' },
        { organization_id: 'org-b', day: '2024-01-02', count: '25' },
      ];

      queryStub.resolves({ data: rows });

      const result = await repository.getPlatformDailyUsageByDateRange(startDate, endDate);

      expect(result).to.deep.equal(rows);
      expect(queryStub.calledOnce).to.equal(true);

      const call = queryStub.firstCall.args[0];
      expect(call.query).to.include('FROM workflow_run_count');
      expect(call.query).to.include("event_type = 'workflow_run_status_processing'");
      expect(call.query).to.include('date >= {startDate:Date}');
      expect(call.query).to.include('date <= {endDate:Date}');
      expect(call.query).to.include('toString(date) as day');
      expect(call.query).to.include('sum(count) as count');
      expect(call.query).to.include('GROUP BY organization_id, date');
      expect(call.query).to.include('ORDER BY organization_id, date');
      expect(call.query).to.not.include('HAVING');
      expect(call.params).to.deep.equal({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(call.params).to.not.have.property('minimumOrganizationTotal');
    });

    it('maps a midnight exclusive endDate to the previous calendar day', async () => {
      queryStub.resolves({ data: [{ organization_id: 'org-a', day: '2024-01-31', count: '3' }] });

      await repository.getPlatformDailyUsageByDateRange(
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-02-01T00:00:00.000Z')
      );

      const call = queryStub.firstCall.args[0];
      expect(call.params).to.deep.equal({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(call.query).to.not.include('HAVING');
      expect(call.params).to.not.have.property('minimumOrganizationTotal');
    });

    it('returns daily rows only for organizations whose window total meets the minimum', async () => {
      const rows = [{ organization_id: 'org-big', day: '2024-01-02', count: '8000' }];

      queryStub.resolves({ data: rows });

      const result = await repository.getPlatformDailyUsageByDateRange(
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2024-02-01T00:00:00.000Z'),
        7500
      );

      expect(result).to.deep.equal(rows);

      const call = queryStub.firstCall.args[0];
      expect(call.query).to.include('organization_id IN (');
      expect(call.query).to.include('SELECT organization_id');
      expect(call.query).to.include('FROM workflow_run_count');
      expect(call.query).to.include("event_type = 'workflow_run_status_processing'");
      expect(call.query).to.include('date >= {startDate:Date}');
      expect(call.query).to.include('date <= {endDate:Date}');
      expect(call.query).to.include('GROUP BY organization_id');
      expect(call.query).to.include('HAVING sum(count) >= {minimumOrganizationTotal:UInt64}');
      expect(call.query).to.include('toString(date) as day');
      expect(call.query).to.include('GROUP BY organization_id, date');
      expect(call.query).to.include('ORDER BY organization_id, date');
      expect(call.query).to.not.include('7500');
      expect(call.params).to.deep.equal({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        minimumOrganizationTotal: 7500,
      });
    });
  });
});
