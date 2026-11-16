import { HttpException } from '@nestjs/common';
import {
  CommunityOrganizationRepository,
  DomainRepository,
  EnvironmentRepository,
  EnvironmentVariableRepository,
  LayoutRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
  OrganizationEntity,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FREE_TIER_LEGACY_MAX_WORKFLOWS,
  FREE_TIER_MAX_WORKFLOWS,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { FeatureFlagsService } from './feature-flags';
import { ResourceValidatorService, SYSTEM_LIMITS } from './resource-validator.service';

const ORGANIZATION_ID = 'org-123';
const ENVIRONMENT_ID = 'env-456';
const OLD_CREATED_AT = '2024-01-01T00:00:00.000Z';

type FlagOverrides = Partial<Record<FeatureFlagsKeysEnum, unknown>>;

function buildService(options: { organization?: Partial<OrganizationEntity>; flags?: FlagOverrides } = {}) {
  const count = sinon.stub().resolves(0);
  const findOne = sinon.stub().resolves({ _id: ENVIRONMENT_ID, _organizationId: ORGANIZATION_ID });
  const findById = sinon.stub().resolves({
    _id: ORGANIZATION_ID,
    apiServiceLevel: ApiServiceLevelEnum.FREE,
    createdAt: OLD_CREATED_AT,
    ...options.organization,
  });
  const flags = options.flags ?? {};
  const getFlag = sinon
    .stub()
    .callsFake(async ({ key, defaultValue }: { key: FeatureFlagsKeysEnum; defaultValue: unknown }) =>
      key in flags ? flags[key] : defaultValue
    );

  const service = new ResourceValidatorService(
    { count } as unknown as NotificationTemplateRepository,
    { findById } as unknown as CommunityOrganizationRepository,
    { findOne } as unknown as EnvironmentRepository,
    { getFlag } as unknown as FeatureFlagsService,
    {} as LayoutRepository,
    {} as EnvironmentVariableRepository,
    {} as MessageTemplateRepository,
    {} as DomainRepository
  );

  return { service, count, findById, getFlag };
}

async function captureWorkflowLimitError(service: ResourceValidatorService): Promise<HttpException> {
  try {
    await service.validateWorkflowLimit(ENVIRONMENT_ID);
  } catch (error) {
    return error as HttpException;
  }

  throw new Error('expected validateWorkflowLimit to throw');
}

describe('ResourceValidatorService workflow limits', () => {
  const originalSelfHosted = process.env.IS_SELF_HOSTED;

  beforeEach(() => {
    process.env.IS_SELF_HOSTED = 'false';
  });

  afterEach(() => {
    sinon.restore();
    process.env.IS_SELF_HOSTED = originalSelfHosted;
  });

  describe('free tier', () => {
    it('allows creating workflows up to the free-tier cap', async () => {
      const { service, count } = buildService();
      count.resolves(FREE_TIER_MAX_WORKFLOWS - 1);

      await service.validateWorkflowLimit(ENVIRONMENT_ID);
    });

    it('blocks the workflow after the cap with a 402 plan limit', async () => {
      const { service, count } = buildService();
      count.resolves(FREE_TIER_MAX_WORKFLOWS);

      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(402);
      expect(error.getResponse()).to.include({ limit: FREE_TIER_MAX_WORKFLOWS, currentCount: FREE_TIER_MAX_WORKFLOWS });
    });

    it('applies the cap regardless of when the organization was created', async () => {
      const { service, count } = buildService({ organization: { createdAt: OLD_CREATED_AT } });
      count.resolves(FREE_TIER_MAX_WORKFLOWS);

      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(402);
    });

    it('keeps blocking an organization that is already above the cap', async () => {
      const { service, count } = buildService();
      count.resolves(12);

      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(402);
      expect(error.getResponse()).to.include({ limit: FREE_TIER_MAX_WORKFLOWS, currentCount: 12 });
    });

    it('skips the organization lookup while under the cap', async () => {
      const { service, count, findById } = buildService();
      count.resolves(FREE_TIER_MAX_WORKFLOWS - 2);

      await service.validateWorkflowLimit(ENVIRONMENT_ID);

      expect(findById.called).to.equal(false);
    });

    it('falls back to the legacy cap when the free-tier limit flag is off', async () => {
      const { service, count } = buildService({
        flags: { [FeatureFlagsKeysEnum.IS_FREE_TIER_WORKFLOW_LIMIT_ENABLED]: false },
      });
      count.resolves(FREE_TIER_LEGACY_MAX_WORKFLOWS - 1);

      await service.validateWorkflowLimit(ENVIRONMENT_ID);

      count.resolves(FREE_TIER_LEGACY_MAX_WORKFLOWS);
      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(402);
      expect(error.getResponse()).to.include({ limit: FREE_TIER_LEGACY_MAX_WORKFLOWS });
    });

    it('keeps the free-tier cap when the free-tier limit flag is on', async () => {
      const { service, count } = buildService({
        flags: { [FeatureFlagsKeysEnum.IS_FREE_TIER_WORKFLOW_LIMIT_ENABLED]: true },
      });
      count.resolves(FREE_TIER_MAX_WORKFLOWS);

      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(402);
    });
  });

  describe('paid and unlimited tiers', () => {
    it('keeps the pro cap at 20', async () => {
      const { service, count } = buildService({ organization: { apiServiceLevel: ApiServiceLevelEnum.PRO } });
      count.resolves(FREE_TIER_MAX_WORKFLOWS);

      await service.validateWorkflowLimit(ENVIRONMENT_ID);

      count.resolves(20);
      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(402);
      expect(error.getResponse()).to.include({ limit: 20 });
    });

    it('does not apply the free-tier cap to business organizations', async () => {
      const { service, count } = buildService({ organization: { apiServiceLevel: ApiServiceLevelEnum.BUSINESS } });
      count.resolves(20);

      await service.validateWorkflowLimit(ENVIRONMENT_ID);
    });

    it('caps unlimited tiers at the system default with a 409', async () => {
      const { service, count } = buildService({ organization: { apiServiceLevel: ApiServiceLevelEnum.BUSINESS } });
      count.resolves(SYSTEM_LIMITS.WORKFLOWS);

      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(409);
    });
  });

  describe('per-organization overrides', () => {
    it('uses a LaunchDarkly override in place of the free-tier cap with a 409', async () => {
      const { service, count } = buildService({
        flags: { [FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER]: 8 },
      });
      count.resolves(8);

      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(409);
      expect(error.getResponse()).to.include({ limit: 8 });
    });

    it('sends the environment and full organization to LaunchDarkly for the workflow limit flag', async () => {
      const createdAt = '2025-06-01T00:00:00.000Z';
      const { service, count, getFlag } = buildService({ organization: { createdAt } });
      count.resolves(FREE_TIER_MAX_WORKFLOWS);

      await captureWorkflowLimitError(service);

      const limitCall = getFlag
        .getCalls()
        .find(({ args }) => args[0].key === FeatureFlagsKeysEnum.MAX_WORKFLOW_LIMIT_NUMBER);
      expect(limitCall).to.not.equal(undefined);
      expect(limitCall?.args[0].environment).to.include({ _id: ENVIRONMENT_ID });
      expect(limitCall?.args[0].organization).to.include({ _id: ORGANIZATION_ID, createdAt });
    });
  });

  describe('self-hosted', () => {
    it('does not apply the free-tier cap on self-hosted deployments', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { service, count } = buildService();
      count.resolves(FREE_TIER_LEGACY_MAX_WORKFLOWS);

      await service.validateWorkflowLimit(ENVIRONMENT_ID);
    });

    it('still applies the system default on self-hosted deployments', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { service, count } = buildService();
      count.resolves(SYSTEM_LIMITS.WORKFLOWS);

      const error = await captureWorkflowLimitError(service);

      expect(error.getStatus()).to.equal(409);
    });
  });

  describe('counting', () => {
    it('excludes demo workflows from the count', async () => {
      const { service, count } = buildService();

      await service.validateWorkflowLimit(ENVIRONMENT_ID);

      expect(count.firstCall.args[0]._environmentId).to.equal(ENVIRONMENT_ID);
      expect(count.firstCall.args[0]['triggers.identifier'].$nin).to.include('demo-verify-otp');
    });
  });
});
