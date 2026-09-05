import { HttpException } from '@nestjs/common';
import { ApiServiceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import { ActivityRetentionService } from './activity-retention.service';

describe('ActivityRetentionService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('clamps missing dates to the plan window and rejects explicit out-of-range dates', async () => {
    const organization = {
      apiServiceLevel: ApiServiceLevelEnum.FREE,
      createdAt: new Date('2026-01-01'),
    };
    const service = new ActivityRetentionService({
      findById: async () => organization,
    } as never);

    process.env.NODE_ENV = 'test';

    const clamped = await service.validateRetentionLimitForTier('org-1');
    const windowMs = new Date(clamped.before).getTime() - new Date(clamped.after).getTime();

    expect(windowMs).to.be.lessThan(26 * 60 * 60 * 1000);
    expect(windowMs).to.be.greaterThan(20 * 60 * 60 * 1000);

    const buffered = service.queryWindowForWorkflowRuns(clamped);
    expect(new Date(buffered.before).getTime() - new Date(clamped.before).getTime()).to.equal(60 * 60 * 1000);
    expect(service.queryWindowForWorkflowRuns(clamped, clamped.before)).to.deep.equal(clamped);

    try {
      await service.validateRetentionLimitForTier('org-1', new Date('2020-01-01').toISOString());
      expect.fail('expected 402');
    } catch (error) {
      expect(error).to.be.instanceOf(HttpException);
      expect((error as HttpException).getStatus()).to.equal(402);
    }
  });
});
