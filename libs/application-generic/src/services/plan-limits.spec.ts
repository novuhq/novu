import { ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, FeatureNameEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { FeatureFlagsService } from './feature-flags';
import { resolveTierLimit, throwPlanLimitExceeded } from './plan-limits';
import { SYSTEM_LIMITS } from './resource-validator.service';

const ORGANIZATION_ID = 'org-123';

function buildParams(flagValue: number, apiServiceLevel: ApiServiceLevelEnum) {
  const getFlag = sinon.stub().resolves(flagValue);

  return {
    params: {
      featureFlagsService: { getFlag } as unknown as FeatureFlagsService,
      flagKey: FeatureFlagsKeysEnum.MAX_CUSTOM_EMAIL_DOMAINS_NUMBER,
      systemDefault: SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS,
      featureName: FeatureNameEnum.AGENT_MAX_CUSTOM_EMAIL_DOMAINS,
      organizationId: ORGANIZATION_ID,
      apiServiceLevel,
    },
    getFlag,
  };
}

describe('plan-limits', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('resolveTierLimit', () => {
    it('returns the plan source and min(system, tier) for tiers with a finite limit', async () => {
      const { params } = buildParams(SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS, ApiServiceLevelEnum.FREE);

      const resolved = await resolveTierLimit(params);

      expect(resolved.limitSource).to.equal('plan');
      expect(resolved.limit).to.equal(0);
      expect(resolved.systemLimit).to.equal(SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS);
    });

    it('caps unlimited tiers at the system default with the system source', async () => {
      const { params } = buildParams(SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS, ApiServiceLevelEnum.BUSINESS);

      const resolved = await resolveTierLimit(params);

      expect(resolved.limitSource).to.equal('system');
      expect(resolved.limit).to.equal(SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS);
    });

    it('treats a LaunchDarkly value differing from the system default as an exact per-org ceiling', async () => {
      const { params } = buildParams(120, ApiServiceLevelEnum.BUSINESS);

      const resolved = await resolveTierLimit(params);

      expect(resolved.limitSource).to.equal('system');
      expect(resolved.limit).to.equal(120);
    });
  });

  describe('throwPlanLimitExceeded', () => {
    it('throws 409 Conflict with counts and support copy for system limits', () => {
      try {
        throwPlanLimitExceeded({ resource: 'agents', limitSource: 'system', limit: 10, currentCount: 10 });
        throw new Error('Expected throwPlanLimitExceeded to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(ConflictException);
        const response = (err as ConflictException).getResponse() as Record<string, unknown>;
        expect(response.message).to.include('reach out to the Novu team');
        expect(response.currentCount).to.equal(10);
        expect(response.limit).to.equal(10);
      }
    });

    it('throws 402 Payment Required with counts and upgrade copy for plan limits', () => {
      try {
        throwPlanLimitExceeded({ resource: 'agents', limitSource: 'plan', limit: 3, currentCount: 3 });
        throw new Error('Expected throwPlanLimitExceeded to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(HttpException);
        expect((err as HttpException).getStatus()).to.equal(HttpStatus.PAYMENT_REQUIRED);
        const response = (err as HttpException).getResponse() as Record<string, unknown>;
        expect(response.message).to.include('Upgrade your plan');
        expect(response.currentCount).to.equal(3);
        expect(response.limit).to.equal(3);
      }
    });

    it('honors a bespoke plan message while keeping the payload shape', () => {
      try {
        throwPlanLimitExceeded({
          resource: 'custom email domains',
          limitSource: 'plan',
          limit: 1,
          currentCount: 1,
          planMessage: 'Custom copy.',
        });
        throw new Error('Expected throwPlanLimitExceeded to throw');
      } catch (err) {
        expect(err).to.be.instanceOf(HttpException);
        const response = (err as HttpException).getResponse() as Record<string, unknown>;
        expect(response.message).to.equal('Custom copy.');
        expect(response.limit).to.equal(1);
      }
    });
  });
});
