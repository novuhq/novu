import { expect } from 'chai';
import { PinoLogger } from 'nestjs-pino';
import sinon from 'sinon';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService } from '../clickhouse.service';
import { TraceLogRepository } from './trace-log.repository';

describe('TraceLogRepository', () => {
  let repository: TraceLogRepository;
  let queryStub: sinon.SinonStub;

  beforeEach(() => {
    queryStub = sinon.stub();

    const logger: Pick<PinoLogger, 'setContext' | 'debug' | 'info' | 'warn' | 'error'> = {
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

  describe('getOrganizationWorkflowRunsCount', () => {
    const startDate = new Date('2026-09-26T09:24:00.000Z');
    const endDate = new Date('2026-10-26T09:24:00.000Z');

    it('counts the processing workflow run traces of the organization within the half-open range', async () => {
      queryStub.resolves({ data: [{ count: '1000' }] });

      const result = await repository.getOrganizationWorkflowRunsCount('org-a', startDate, endDate);

      expect(result).to.equal(1000);
      expect(queryStub.calledOnce).to.equal(true);

      const call = queryStub.firstCall.args[0];
      expect(call.query).to.include('FROM traces');
      expect(call.query).to.include('organization_id = {organizationId:String}');
      expect(call.query).to.include("entity_type = 'workflow_run'");
      expect(call.query).to.include("event_type = 'workflow_run_status_processing'");
      expect(call.query).to.include("created_at >= {startDate:DateTime64(3, 'UTC')}");
      expect(call.query).to.include("created_at < {endDate:DateTime64(3, 'UTC')}");
      expect(call.params).to.deep.equal({
        organizationId: 'org-a',
        startDate: '2026-09-26T09:24:00.000',
        endDate: '2026-10-26T09:24:00.000',
      });
    });

    it('returns 0 when ClickHouse has no rows', async () => {
      queryStub.resolves({ data: [] });

      const result = await repository.getOrganizationWorkflowRunsCount('org-a', startDate, endDate);

      expect(result).to.equal(0);
    });
  });
});
