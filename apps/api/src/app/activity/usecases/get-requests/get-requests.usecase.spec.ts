import { HttpException, HttpStatus } from '@nestjs/common';
import { expect } from 'chai';
import { SinonStub, stub } from 'sinon';
import { GetRequestsCommand } from './get-requests.command';
import { GetRequests } from './get-requests.usecase';

describe('GetRequests', () => {
  const retentionStart = '2026-11-25T12:00:00.000Z';

  function buildCommand(overrides: Partial<GetRequestsCommand> = {}) {
    return Object.assign(new GetRequestsCommand(), {
      environmentId: 'environment-id',
      organizationId: 'organization-id',
      ...overrides,
    });
  }

  function buildUsecase(resolve = stub().resolves({ after: retentionStart, before: '2026-11-26T12:00:00.000Z' })) {
    const requestLogRepository = {
      find: stub().resolves({ data: [] }),
      count: stub().resolves(0),
    };
    const activityRetentionService = { resolve };

    return {
      usecase: new GetRequests(requestLogRepository as never, activityRetentionService as never),
      requestLogRepository,
      resolve,
    };
  }

  function createdAtCondition(requestLogRepository: { find: SinonStub }) {
    const { where } = requestLogRepository.find.firstCall.args[0];

    return where.conditions.find((condition) => condition.field === 'created_at');
  }

  it('limits the logs to the retention window when createdGte is missing', async () => {
    const { usecase, requestLogRepository, resolve } = buildUsecase();

    await usecase.execute(buildCommand());

    expect(resolve.firstCall.args[0]).to.deep.equal({ organizationId: 'organization-id', after: undefined });
    expect(createdAtCondition(requestLogRepository)).to.deep.equal({
      field: 'created_at',
      operator: '>=',
      value: '2026-11-25T12:00:00.000',
    });
  });

  it('checks createdGte, sent in epoch milliseconds, against the retention window', async () => {
    const createdGte = Date.parse('2026-11-26T08:30:00.000Z');
    const { usecase, requestLogRepository, resolve } = buildUsecase(
      stub().resolves({ after: '2026-11-26T08:30:00.000Z', before: '2026-11-26T12:00:00.000Z' })
    );

    await usecase.execute(buildCommand({ createdGte }));

    expect(resolve.firstCall.args[0]).to.deep.equal({
      organizationId: 'organization-id',
      after: '2026-11-26T08:30:00.000Z',
    });
    expect(createdAtCondition(requestLogRepository)?.value).to.equal('2026-11-26T08:30:00.000');
  });

  it('returns the 402 for a createdGte older than the window without querying ClickHouse', async () => {
    const retentionError = new HttpException('Requested date range exceeds', HttpStatus.PAYMENT_REQUIRED);
    const { usecase, requestLogRepository } = buildUsecase(stub().rejects(retentionError));

    try {
      await usecase.execute(buildCommand({ createdGte: Date.parse('2026-08-01T00:00:00.000Z') }));
      expect.fail('Expected the retention check to reject the range');
    } catch (error) {
      expect(error).to.equal(retentionError);
    }

    expect(requestLogRepository.find.called).to.equal(false);
    expect(requestLogRepository.count.called).to.equal(false);
  });

  it('leaves the logs unbounded when the plan keeps everything', async () => {
    const { usecase, requestLogRepository } = buildUsecase(stub().resolves({ after: undefined, before: undefined }));

    await usecase.execute(buildCommand());

    expect(createdAtCondition(requestLogRepository)).to.equal(undefined);
  });

  it('rejects a createdGte outside the range of a date with 400', async () => {
    const { usecase, resolve } = buildUsecase();

    try {
      await usecase.execute(buildCommand({ createdGte: 1e20 }));
      expect.fail('Expected an invalid createdGte');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(HttpStatus.BAD_REQUEST);
    }

    expect(resolve.called).to.equal(false);
  });
});
