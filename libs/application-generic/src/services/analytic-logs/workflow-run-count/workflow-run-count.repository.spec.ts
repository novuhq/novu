import { expect } from 'chai';
import { PinoLogger } from 'nestjs-pino';
import sinon from 'sinon';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { WorkflowRunCountRepository } from './workflow-run-count.repository';

describe('WorkflowRunCountRepository', () => {
  let repository: WorkflowRunCountRepository;
  let queryStub: sinon.SinonStub;
  let warnStub: sinon.SinonStub;
  let logger: Pick<PinoLogger, 'setContext' | 'debug' | 'info' | 'warn' | 'error'>;

  beforeEach(() => {
    queryStub = sinon.stub();
    warnStub = sinon.stub();

    logger = {
      setContext: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      warn: warnStub,
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

  describe('getPlatformUsageByWholeUtcDays', () => {
    it('queries workflow_run_count for processing events and returns rows', async () => {
      const startDate = new Date('2024-01-01T12:34:56.000Z');
      const endDate = new Date('2024-01-31T23:59:59.000Z');
      const rows = [
        { organization_id: 'org-a', count: '10' },
        { organization_id: 'org-b', count: '25' },
      ];

      queryStub.resolves({ data: rows });

      const result = await repository.getPlatformUsageByWholeUtcDays(startDate, endDate);

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

      await repository.getPlatformUsageByWholeUtcDays(
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

      const result = await repository.getPlatformUsageByWholeUtcDays(startDate, endDate, 'org-only');

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

      const result = await repository.getPlatformUsageByWholeUtcDays(
        new Date('2024-03-01T00:00:00.000Z'),
        new Date('2024-04-01T00:00:00.000Z')
      );

      expect(result).to.deep.equal([]);
    });
  });

  describe('getOrganizationUsageInExactRange', () => {
    const startDate = new Date('2026-09-26T09:24:00.000Z');
    const endDate = new Date('2026-10-26T09:24:00.000Z');

    function stubCounts(wholeDayRows: Array<{ organization_id: string; count: string }>, edgeDayCount: string) {
      queryStub.callsFake(async ({ query }: { query: string }) =>
        query.includes('FROM traces') ? { data: [{ count: edgeDayCount }] } : { data: wholeDayRows }
      );
    }

    it('subtracts the edge-day runs outside the range from the whole-day count', async () => {
      stubCounts([{ organization_id: 'org-a', count: '1500' }], '500');

      const result = await repository.getOrganizationUsageInExactRange('org-a', startDate, endDate);

      expect(result).to.equal(1000);
      expect(queryStub.calledTwice).to.equal(true);

      const wholeDayCall = queryStub.getCalls().find((call) => call.args[0].query.includes('FROM workflow_run_count'));
      expect(wholeDayCall?.args[0].params).to.deep.equal({
        startDate: '2026-09-26',
        endDate: '2026-10-26',
        organizationId: 'org-a',
      });
    });

    it('clamps to 0 and warns when the edge-day runs exceed the whole-day count', async () => {
      stubCounts([{ organization_id: 'org-a', count: '100' }], '150');

      const result = await repository.getOrganizationUsageInExactRange('org-a', startDate, endDate);

      expect(result).to.equal(0);
      expect(warnStub.calledOnce).to.equal(true);
      expect(warnStub.firstCall.args[0]).to.deep.equal({
        organizationId: 'org-a',
        wholeDayCount: 100,
        edgeDayRunsOutside: 150,
      });
    });

    it('returns 0 without warning when the edge-day runs equal the whole-day count', async () => {
      stubCounts([{ organization_id: 'org-a', count: '150' }], '150');

      const result = await repository.getOrganizationUsageInExactRange('org-a', startDate, endDate);

      expect(result).to.equal(0);
      expect(warnStub.called).to.equal(false);
    });

    it('returns 0 when neither query has rows', async () => {
      queryStub.resolves({ data: [] });

      const result = await repository.getOrganizationUsageInExactRange('org-a', startDate, endDate);

      expect(result).to.equal(0);
    });
  });

  describe('excludeEdgeDayRunsOutsideRange', () => {
    it('counts the processing workflow runs of the first and last UTC day that fall outside the range', async () => {
      queryStub.resolves({ data: [{ count: '500' }] });

      const result = await repository.excludeEdgeDayRunsOutsideRange(
        'org-a',
        1500,
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(result).to.equal(1000);
      expect(queryStub.calledOnce).to.equal(true);

      const call = queryStub.firstCall.args[0];
      expect(call.query).to.include('FROM traces');
      expect(call.query).to.include('organization_id = {organizationId:String}');
      expect(call.query).to.include("entity_type = 'workflow_run'");
      expect(call.query).to.include("event_type = 'workflow_run_status_processing'");
      expect(call.query).to.include(
        "(created_at >= {firstDayStart:DateTime64(3, 'UTC')} AND created_at < {startDate:DateTime64(3, 'UTC')})"
      );
      expect(call.query).to.include(
        "(created_at >= {endDate:DateTime64(3, 'UTC')} AND created_at < {lastDayEnd:DateTime64(3, 'UTC')})"
      );
      expect(call.params).to.deep.equal({
        organizationId: 'org-a',
        firstDayStart: '2026-09-26T00:00:00.000',
        startDate: '2026-09-26T09:24:00.000',
        endDate: '2026-10-26T09:24:00.000',
        lastDayEnd: '2026-10-27T00:00:00.000',
      });
    });

    it('tags the edge-day query with a log comment so its load can be found in system.query_log', async () => {
      queryStub.resolves({ data: [{ count: '500' }] });

      await repository.excludeEdgeDayRunsOutsideRange(
        'org-a',
        1500,
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(queryStub.firstCall.args[0].clickhouse_settings).to.deep.equal({
        log_comment: 'workflow_run_count_edge_day_correction',
      });
    });

    it('returns the passed count without querying when the range starts and ends at UTC midnight', async () => {
      const result = await repository.excludeEdgeDayRunsOutsideRange(
        'org-a',
        1500,
        new Date('2026-09-26T00:00:00.000Z'),
        new Date('2026-10-26T00:00:00.000Z')
      );

      expect(result).to.equal(1500);
      expect(queryStub.called).to.equal(false);
    });

    it('subtracts from the passed count without running the whole-day query', async () => {
      queryStub.resolves({ data: [{ count: '200' }] });

      const result = await repository.excludeEdgeDayRunsOutsideRange(
        'org-a',
        700,
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(result).to.equal(500);
      expect(queryStub.calledOnce).to.equal(true);
      expect(queryStub.firstCall.args[0].query).to.not.include('FROM workflow_run_count');
    });

    it('leaves the last day empty when a mid-day period ends at UTC midnight', async () => {
      queryStub.resolves({ data: [{ count: '4' }] });

      await repository.excludeEdgeDayRunsOutsideRange(
        'org-a',
        10,
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T00:00:00.000Z')
      );

      expect(queryStub.firstCall.args[0].params).to.deep.include({
        firstDayStart: '2026-09-26T00:00:00.000',
        startDate: '2026-09-26T09:24:00.000',
        endDate: '2026-10-26T00:00:00.000',
        lastDayEnd: '2026-10-26T00:00:00.000',
      });
    });

    it('leaves the first day empty when a period that starts at UTC midnight ends mid-day', async () => {
      queryStub.resolves({ data: [{ count: '4' }] });

      await repository.excludeEdgeDayRunsOutsideRange(
        'org-a',
        10,
        new Date('2026-09-26T00:00:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(queryStub.firstCall.args[0].params).to.deep.include({
        firstDayStart: '2026-09-26T00:00:00.000',
        startDate: '2026-09-26T00:00:00.000',
        endDate: '2026-10-26T09:24:00.000',
        lastDayEnd: '2026-10-27T00:00:00.000',
      });
    });

    it('subtracts nothing when the edge-day query has no rows', async () => {
      queryStub.resolves({ data: [] });

      const result = await repository.excludeEdgeDayRunsOutsideRange(
        'org-a',
        10,
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(result).to.equal(10);
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
