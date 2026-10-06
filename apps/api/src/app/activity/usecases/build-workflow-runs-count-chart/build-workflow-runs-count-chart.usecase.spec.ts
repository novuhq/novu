import { expect } from 'chai';
import { restore, stub } from 'sinon';
import { BuildWorkflowRunsCountChartCommand } from './build-workflow-runs-count-chart.command';
import { BuildWorkflowRunsCountChart } from './build-workflow-runs-count-chart.usecase';

describe('BuildWorkflowRunsCountChart', () => {
  const baseCommand = {
    environmentId: 'environment-id',
    organizationId: 'organization-id',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-01-31T23:59:59.999Z'),
  };

  let workflowRunRepositoryMock;
  let workflowRunCountRepositoryMock;
  let featureFlagsServiceMock;
  let loggerMock;
  let usecase: BuildWorkflowRunsCountChart;

  beforeEach(() => {
    workflowRunRepositoryMock = {
      count: stub().resolves(1),
    };
    workflowRunCountRepositoryMock = {
      getTotalRunsCount: stub().resolves(9728),
    };
    featureFlagsServiceMock = {
      getFlag: stub().resolves(true),
    };
    loggerMock = {
      setContext: stub(),
      error: stub(),
    };

    usecase = new BuildWorkflowRunsCountChart(
      workflowRunRepositoryMock,
      workflowRunCountRepositoryMock,
      featureFlagsServiceMock,
      loggerMock
    );
  });

  afterEach(() => {
    restore();
  });

  it('uses the pre-aggregated count when the flag is enabled and no granular filters are set', async () => {
    const result = await usecase.execute(Object.assign(new BuildWorkflowRunsCountChartCommand(), baseCommand));

    expect(result).to.deep.equal({ count: 9728 });
    expect(workflowRunCountRepositoryMock.getTotalRunsCount.calledOnce).to.equal(true);
    expect(workflowRunRepositoryMock.count.called).to.equal(false);
  });

  it('counts from raw workflow runs when the flag is disabled', async () => {
    featureFlagsServiceMock.getFlag.resolves(false);

    const result = await usecase.execute(Object.assign(new BuildWorkflowRunsCountChartCommand(), baseCommand));

    expect(result).to.deep.equal({ count: 1 });
    expect(workflowRunCountRepositoryMock.getTotalRunsCount.called).to.equal(false);
    expect(workflowRunRepositoryMock.count.calledOnce).to.equal(true);
  });

  it('counts from raw workflow runs when filtering by transaction id even if the flag is enabled', async () => {
    const result = await usecase.execute(
      Object.assign(new BuildWorkflowRunsCountChartCommand(), {
        ...baseCommand,
        transactionIds: ['txn_6ac3fe5507qgi9gudtsc'],
      })
    );

    expect(result).to.deep.equal({ count: 1 });
    expect(workflowRunCountRepositoryMock.getTotalRunsCount.called).to.equal(false);
    expect(featureFlagsServiceMock.getFlag.called).to.equal(false);
    expect(workflowRunRepositoryMock.count.calledOnce).to.equal(true);

    const { where } = workflowRunRepositoryMock.count.firstCall.args[0];
    expect(where.enforced).to.deep.equal({ environmentId: 'environment-id' });
    expect(where.conditions).to.deep.include({
      field: 'transaction_id',
      operator: 'IN',
      value: ['txn_6ac3fe5507qgi9gudtsc'],
    });
  });

  const granularFilterCases: Array<Partial<BuildWorkflowRunsCountChartCommand>> = [
    { workflowIds: ['workflow-id'] },
    { subscriberIds: ['subscriber-id'] },
    { channels: ['email'] },
    { topicKey: 'topic-key' },
  ];

  for (const filters of granularFilterCases) {
    const [filterName] = Object.keys(filters);

    it(`counts from raw workflow runs when filtering by ${filterName} even if the flag is enabled`, async () => {
      await usecase.execute(Object.assign(new BuildWorkflowRunsCountChartCommand(), { ...baseCommand, ...filters }));

      expect(workflowRunCountRepositoryMock.getTotalRunsCount.called).to.equal(false);
      expect(workflowRunRepositoryMock.count.calledOnce).to.equal(true);
    });
  }
});
