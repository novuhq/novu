import { expect } from 'chai';
import { subDays } from 'date-fns';
import sinon, { stub } from 'sinon';
import { GetActivityGraphStatsCommand } from './get-activity-graph-states.command';
import { GetActivityGraphStats } from './get-activity-graph-states.usecase';

describe('GetActivityGraphStats', () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = new Date('2026-11-26T12:00:00.000Z');
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);
  });

  afterEach(() => {
    clock.restore();
  });

  function buildCommand(days: number) {
    return Object.assign(new GetActivityGraphStatsCommand(), {
      environmentId: 'environment-id',
      organizationId: 'organization-id',
      userId: 'user-id',
      days,
    });
  }

  function buildUsecase(retentionStart?: string) {
    const notificationRepository = { getActivityGraphStats: stub().resolves([]) };
    const activityRetentionService = {
      resolve: stub().resolves({ after: retentionStart, before: retentionStart ? now.toISOString() : undefined }),
    };

    return {
      usecase: new GetActivityGraphStats(notificationRepository as never, activityRetentionService as never),
      notificationRepository,
      activityRetentionService,
    };
  }

  it('caps the requested days at the retention window', async () => {
    const retentionStart = new Date(now.getTime() - 7 * dayMs).toISOString();
    const { usecase, notificationRepository, activityRetentionService } = buildUsecase(retentionStart);

    await usecase.execute(buildCommand(365));

    expect(activityRetentionService.resolve.firstCall.args[0]).to.deep.equal({ organizationId: 'organization-id' });
    expect(notificationRepository.getActivityGraphStats.firstCall.args).to.deep.equal([
      new Date(retentionStart),
      'environment-id',
    ]);
  });

  it('keeps a range that fits inside the retention window', async () => {
    const { usecase, notificationRepository } = buildUsecase(new Date(now.getTime() - 90 * dayMs).toISOString());

    await usecase.execute(buildCommand(32));

    expect(notificationRepository.getActivityGraphStats.firstCall.args[0]).to.deep.equal(subDays(now, 32));
  });

  it('keeps the requested days when the plan keeps everything', async () => {
    const { usecase, notificationRepository } = buildUsecase();

    await usecase.execute(buildCommand(365));

    expect(notificationRepository.getActivityGraphStats.firstCall.args[0]).to.deep.equal(subDays(now, 365));
  });
});
