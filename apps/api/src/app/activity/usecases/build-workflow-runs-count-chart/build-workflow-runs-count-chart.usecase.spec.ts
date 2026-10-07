import { NotificationRepository } from '@novu/dal';
import { expect } from 'chai';
import { restore, type SinonStub, stub } from 'sinon';
import { WorkflowRunStatusDtoEnum } from '../../dtos/shared.dto';
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
  let notificationRepository: NotificationRepository;
  let countNotifications: SinonStub;
  let subscriberRepositoryMock;
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
    notificationRepository = new NotificationRepository();
    countNotifications = stub(notificationRepository, 'count').resolves(1);
    subscriberRepositoryMock = {
      searchSubscribers: stub().resolves(['mongo-subscriber-id']),
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
      notificationRepository,
      subscriberRepositoryMock,
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
    expect(countNotifications.called).to.equal(false);
    expect(workflowRunRepositoryMock.count.called).to.equal(false);
  });

  it('counts from raw workflow runs when the flag is disabled and no filters are set', async () => {
    featureFlagsServiceMock.getFlag.resolves(false);

    const result = await usecase.execute(Object.assign(new BuildWorkflowRunsCountChartCommand(), baseCommand));

    expect(result).to.deep.equal({ count: 1 });
    expect(workflowRunCountRepositoryMock.getTotalRunsCount.called).to.equal(false);
    expect(workflowRunRepositoryMock.count.calledOnce).to.equal(true);
    expect(countNotifications.called).to.equal(false);
  });

  it('counts notifications by transaction id even if the aggregated-count flag is enabled', async () => {
    const result = await usecase.execute(
      Object.assign(new BuildWorkflowRunsCountChartCommand(), {
        ...baseCommand,
        transactionIds: ['txn_6ac3fe5507qgi9gudtsc'],
      })
    );

    expect(result).to.deep.equal({ count: 1 });
    expect(workflowRunCountRepositoryMock.getTotalRunsCount.called).to.equal(false);
    expect(workflowRunRepositoryMock.count.called).to.equal(false);
    expect(featureFlagsServiceMock.getFlag.called).to.equal(false);
    expect(countNotifications.calledOnce).to.equal(true);

    const [query, limit, readPreference] = countNotifications.firstCall.args;
    expect(limit).to.equal(undefined);
    expect(readPreference).to.equal('secondaryPreferred');
    expect(query).to.deep.equal({
      _environmentId: 'environment-id',
      transactionId: { $in: ['txn_6ac3fe5507qgi9gudtsc'] },
      createdAt: {
        $gte: '2026-01-01T00:00:00.000Z',
        $lte: '2026-01-31T23:59:59.999Z',
      },
    });
  });

  it('resolves external subscriber ids before counting notifications', async () => {
    await usecase.execute(
      Object.assign(new BuildWorkflowRunsCountChartCommand(), {
        ...baseCommand,
        subscriberIds: ['external-subscriber-id'],
      })
    );

    expect(
      subscriberRepositoryMock.searchSubscribers.calledOnceWith('environment-id', ['external-subscriber-id'])
    ).to.equal(true);
    expect(countNotifications.firstCall.args[0]._subscriberId).to.deep.equal({
      $in: ['mongo-subscriber-id'],
    });
  });

  it('returns zero when none of the subscriber ids exist', async () => {
    subscriberRepositoryMock.searchSubscribers.resolves([]);

    const result = await usecase.execute(
      Object.assign(new BuildWorkflowRunsCountChartCommand(), {
        ...baseCommand,
        subscriberIds: ['missing-subscriber'],
      })
    );

    expect(result).to.deep.equal({ count: 0 });
    expect(countNotifications.called).to.equal(false);
  });

  it('counts notifications for a workflow, channel, and topic filter', async () => {
    await usecase.execute(
      Object.assign(new BuildWorkflowRunsCountChartCommand(), {
        ...baseCommand,
        workflowIds: ['workflow-id'],
        channels: ['email'],
        topicKey: 'topic-key',
      })
    );

    expect(countNotifications.firstCall.args[0]._templateId).to.deep.equal({ $in: ['workflow-id'] });
    expect(countNotifications.firstCall.args[0].channels).to.deep.equal({ $in: ['email'] });
    expect(countNotifications.firstCall.args[0]['topics.topicKey']).to.equal('topic-key');
    expect(workflowRunRepositoryMock.count.called).to.equal(false);
  });

  it('counts notifications by the recorded terminal workflow status', async () => {
    await usecase.execute(
      Object.assign(new BuildWorkflowRunsCountChartCommand(), {
        ...baseCommand,
        statuses: [WorkflowRunStatusDtoEnum.COMPLETED, WorkflowRunStatusDtoEnum.ERROR],
      })
    );

    expect(countNotifications.firstCall.args[0].$and).to.deep.equal([
      {
        $or: [
          {
            lastEmittedWorkflowStatusEvent: {
              $in: ['workflow_run_status_completed', 'workflow_run_status_error'],
            },
          },
        ],
      },
    ]);
  });
});
