import { expect } from 'chai';
import { PinoLogger } from 'nestjs-pino';
import sinon from 'sinon';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { TraceLogRepository } from './trace-log.repository';

describe('TraceLogRepository', () => {
  let repository: TraceLogRepository;
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

    repository = new TraceLogRepository(
      { query } as ClickHouseService,
      logger as PinoLogger,
      {} as FeatureFlagsService
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('countEdgeDayWorkflowRunsOutsideRange', () => {
    it('counts the processing workflow runs of the first and last UTC day that fall outside the range', async () => {
      queryStub.resolves({ data: [{ count: '500' }] });

      const result = await repository.countEdgeDayWorkflowRunsOutsideRange(
        'org-a',
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(result).to.equal(500);
      expect(queryStub.calledOnce).to.equal(true);

      const call = queryStub.firstCall.args[0];
      expect(call.query).to.include('FROM traces');
      expect(call.query).to.include('organization_id = {organizationId:String}');
      expect(call.query).to.include("entity_type = 'workflow_run'");
      expect(call.query).to.include("event_type = 'workflow_run_status_processing'");
      expect(call.query).to.include(
        '(created_at >= {startDayStart:DateTime64(3)} AND created_at < {startDate:DateTime64(3)})'
      );
      expect(call.query).to.include(
        '(created_at >= {endDate:DateTime64(3)} AND created_at < {endDayEnd:DateTime64(3)})'
      );
      expect(call.params).to.deep.equal({
        organizationId: 'org-a',
        startDayStart: '2026-09-26T00:00:00.000',
        startDate: '2026-09-26T09:24:00.000',
        endDate: '2026-10-26T09:24:00.000',
        endDayEnd: '2026-10-27T00:00:00.000',
      });
    });

    it('tags the query with a log comment so its load can be found in system.query_log', async () => {
      queryStub.resolves({ data: [{ count: '500' }] });

      await repository.countEdgeDayWorkflowRunsOutsideRange(
        'org-a',
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(queryStub.firstCall.args[0].clickhouse_settings).to.deep.equal({
        log_comment: 'billing_exact_period_start',
      });
    });

    it('returns 0 without querying when the range starts and ends at UTC midnight', async () => {
      const result = await repository.countEdgeDayWorkflowRunsOutsideRange(
        'org-a',
        new Date('2026-09-26T00:00:00.000Z'),
        new Date('2026-10-26T00:00:00.000Z')
      );

      expect(result).to.equal(0);
      expect(queryStub.called).to.equal(false);
    });

    const rollovers = [
      { time: '00:30', startDate: '2026-09-26T00:30:00.000', endDate: '2026-10-26T00:30:00.000' },
      { time: '09:24', startDate: '2026-09-26T09:24:00.000', endDate: '2026-10-26T09:24:00.000' },
      { time: '23:59', startDate: '2026-09-26T23:59:00.000', endDate: '2026-10-26T23:59:00.000' },
    ];

    for (const { time, startDate, endDate } of rollovers) {
      it(`bounds both edge days of a period that rolls over at ${time} UTC`, async () => {
        queryStub.resolves({ data: [{ count: '1' }] });

        await repository.countEdgeDayWorkflowRunsOutsideRange(
          'org-a',
          new Date(`${startDate}Z`),
          new Date(`${endDate}Z`)
        );

        expect(queryStub.firstCall.args[0].params).to.deep.equal({
          organizationId: 'org-a',
          startDayStart: '2026-09-26T00:00:00.000',
          startDate,
          endDate,
          endDayEnd: '2026-10-27T00:00:00.000',
        });
      });
    }

    it('leaves the last day empty when a mid-day period ends at UTC midnight', async () => {
      queryStub.resolves({ data: [{ count: '4' }] });

      await repository.countEdgeDayWorkflowRunsOutsideRange(
        'org-a',
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T00:00:00.000Z')
      );

      expect(queryStub.firstCall.args[0].params).to.deep.include({
        startDayStart: '2026-09-26T00:00:00.000',
        startDate: '2026-09-26T09:24:00.000',
        endDate: '2026-10-26T00:00:00.000',
        endDayEnd: '2026-10-26T00:00:00.000',
      });
    });

    it('returns 0 when ClickHouse has no rows', async () => {
      queryStub.resolves({ data: [] });

      const result = await repository.countEdgeDayWorkflowRunsOutsideRange(
        'org-a',
        new Date('2026-09-26T09:24:00.000Z'),
        new Date('2026-10-26T09:24:00.000Z')
      );

      expect(result).to.equal(0);
    });
  });
});
