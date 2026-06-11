import { AgentIntegrationRepository, AgentRepository, CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, UNLIMITED_VALUE } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_CREATION_GRACE, AgentEntitlementsService } from './agent-entitlements.service';
import { FeatureFlagsService } from './feature-flags';
import { SYSTEM_LIMITS } from './resource-validator.service';

const ORGANIZATION_ID = 'org-123';

interface Stubs {
  getFlag: sinon.SinonStub;
  findById: sinon.SinonStub;
  countByOrganization: sinon.SinonStub;
  countTotalByOrganization: sinon.SinonStub;
  countOlderAgentsInOrganization: sinon.SinonStub;
  findOldestAgentIds: sinon.SinonStub;
  listConnectedIntegrationIdsForOrganization: sinon.SinonStub;
}

function buildService(apiServiceLevel: ApiServiceLevelEnum): { service: AgentEntitlementsService; stubs: Stubs } {
  const getFlag = sinon.stub().resolves(SYSTEM_LIMITS.AGENTS);
  const findById = sinon.stub().resolves({ _id: ORGANIZATION_ID, apiServiceLevel });
  const countByOrganization = sinon.stub().resolves(0);
  const countTotalByOrganization = sinon.stub().resolves(0);
  const countOlderAgentsInOrganization = sinon.stub().resolves(0);
  const findOldestAgentIds = sinon.stub().resolves([]);
  const listConnectedIntegrationIdsForOrganization = sinon.stub().resolves([]);

  const featureFlagsService = { getFlag } as unknown as FeatureFlagsService;
  const organizationRepository = { findById } as unknown as CommunityOrganizationRepository;
  const agentRepository = {
    countByOrganization,
    countTotalByOrganization,
    countOlderAgentsInOrganization,
    findOldestAgentIds,
  } as unknown as AgentRepository;
  const agentIntegrationRepository = {
    listConnectedIntegrationIdsForOrganization,
  } as unknown as AgentIntegrationRepository;

  const service = new AgentEntitlementsService(
    featureFlagsService,
    organizationRepository,
    agentRepository,
    agentIntegrationRepository
  );

  return {
    service,
    stubs: {
      getFlag,
      findById,
      countByOrganization,
      countTotalByOrganization,
      countOlderAgentsInOrganization,
      findOldestAgentIds,
      listConnectedIntegrationIdsForOrganization,
    },
  };
}

describe('AgentEntitlementsService', () => {
  const originalSelfHosted = process.env.IS_SELF_HOSTED;

  afterEach(() => {
    sinon.restore();
    process.env.IS_SELF_HOSTED = originalSelfHosted;
  });

  describe('getAgentLimit', () => {
    it('returns the tier limit for a free plan when LaunchDarkly returns the system default', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(SYSTEM_LIMITS.AGENTS);

      const limit = await service.getAgentLimit(ORGANIZATION_ID);

      expect(limit).to.equal(2);
    });

    it('caps enterprise at the system default when no per-org override is set', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.ENTERPRISE);
      stubs.getFlag.resolves(SYSTEM_LIMITS.AGENTS);

      const limit = await service.getAgentLimit(ORGANIZATION_ID);

      expect(limit).to.equal(SYSTEM_LIMITS.AGENTS);
    });

    it('honors a LaunchDarkly per-org override that differs from the system default', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.ENTERPRISE);
      stubs.getFlag.resolves(250);

      const limit = await service.getAgentLimit(ORGANIZATION_ID);

      expect(limit).to.equal(250);
    });

    it('returns unlimited for self-hosted deployments', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { service } = buildService(ApiServiceLevelEnum.FREE);

      const limit = await service.getAgentLimit(ORGANIZATION_ID);

      expect(limit).to.equal(UNLIMITED_VALUE);
    });
  });

  describe('getAgentLimits', () => {
    it('grants a creation grace buffer on top of the plan limit for limited tiers', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(SYSTEM_LIMITS.AGENTS);

      const limits = await service.getAgentLimits(ORGANIZATION_ID);

      expect(limits.limitSource).to.equal('plan');
      expect(limits.creationLimit).to.equal(limits.planLimit + AGENT_CREATION_GRACE);
    });

    it('uses the system limit with no grace buffer for unlimited tiers', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.ENTERPRISE);
      stubs.getFlag.resolves(SYSTEM_LIMITS.AGENTS);

      const limits = await service.getAgentLimits(ORGANIZATION_ID);

      expect(limits.limitSource).to.equal('system');
      expect(limits.planLimit).to.equal(SYSTEM_LIMITS.AGENTS);
      expect(limits.creationLimit).to.equal(SYSTEM_LIMITS.AGENTS);
    });

    it('treats a LaunchDarkly per-org override as an exact system ceiling', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(250);

      const limits = await service.getAgentLimits(ORGANIZATION_ID);

      expect(limits.limitSource).to.equal('system');
      expect(limits.planLimit).to.equal(250);
      expect(limits.creationLimit).to.equal(250);
    });
  });

  describe('canCreateAgent', () => {
    it('blocks creation once the total agent count (incl. inactive) reaches the creation limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(10);
      stubs.countTotalByOrganization.resolves(10);

      const allowance = await service.canCreateAgent(ORGANIZATION_ID);

      expect(allowance.allowed).to.equal(false);
      expect(allowance.creationLimit).to.equal(10);
      expect(allowance.limitSource).to.equal('system');
    });

    it('allows creation while below the creation limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(10);
      stubs.countTotalByOrganization.resolves(9);

      const allowance = await service.canCreateAgent(ORGANIZATION_ID);

      expect(allowance.allowed).to.equal(true);
    });

    it('always allows creation for self-hosted deployments', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);

      const allowance = await service.canCreateAgent(ORGANIZATION_ID);

      expect(allowance.allowed).to.equal(true);
      expect(stubs.countTotalByOrganization.called).to.equal(false);
    });
  });

  describe('getCustomEmailDomainLimits', () => {
    it('returns the plan source for tiers with a finite domain limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS);

      const limits = await service.getCustomEmailDomainLimits(ORGANIZATION_ID);

      expect(limits.limitSource).to.equal('plan');
      expect(limits.limit).to.equal(0);
    });

    it('caps unlimited tiers at the system default with the system source', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.BUSINESS);
      stubs.getFlag.resolves(SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS);

      const limits = await service.getCustomEmailDomainLimits(ORGANIZATION_ID);

      expect(limits.limitSource).to.equal('system');
      expect(limits.limit).to.equal(SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS);
    });

    it('treats a LaunchDarkly per-org override as an exact system ceiling', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.BUSINESS);
      stubs.getFlag.resolves(120);

      const limits = await service.getCustomEmailDomainLimits(ORGANIZATION_ID);

      expect(limits.limitSource).to.equal('system');
      expect(limits.limit).to.equal(120);
    });
  });

  describe('getActiveChannelLimit', () => {
    it('uses the tier table only (no LaunchDarkly lookup)', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);

      const limit = await service.getActiveChannelLimit(ORGANIZATION_ID);

      expect(limit).to.equal(2);
      expect(stubs.getFlag.called).to.equal(false);
    });
  });

  describe('isAgentWithinLimit', () => {
    it('allows agents whose creation rank is below the limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.countOlderAgentsInOrganization.resolves(1);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, 'agent-1');

      expect(withinLimit).to.equal(true);
    });

    it('blocks agents whose creation rank is at or beyond the limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.countOlderAgentsInOrganization.resolves(3);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, 'agent-4');

      expect(withinLimit).to.equal(false);
    });

    it('never blocks agents for system-capped unlimited tiers', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.ENTERPRISE);
      stubs.countOlderAgentsInOrganization.resolves(SYSTEM_LIMITS.AGENTS + 5);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, 'agent-over');

      expect(withinLimit).to.equal(true);
      expect(stubs.countOlderAgentsInOrganization.called).to.equal(false);
    });

    it('never blocks agents under a LaunchDarkly per-org override, even when over it', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(10);
      stubs.countOlderAgentsInOrganization.resolves(15);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, 'agent-over');

      expect(withinLimit).to.equal(true);
      expect(stubs.countOlderAgentsInOrganization.called).to.equal(false);
    });
  });

  describe('getAgentPlanUsage', () => {
    it('lists within-limit agent ids when a plan-limited org is over its limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.countByOrganization.resolves(3);
      stubs.countTotalByOrganization.resolves(3);
      stubs.findOldestAgentIds.resolves(['agent-1', 'agent-2']);

      const usage = await service.getAgentPlanUsage(ORGANIZATION_ID);

      expect(usage.limitSource).to.equal('plan');
      expect(usage.withinLimitAgentIds).to.deep.equal(['agent-1', 'agent-2']);
    });

    it('does not flag agents as over-limit for system-capped organizations', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(10);
      stubs.countByOrganization.resolves(15);
      stubs.countTotalByOrganization.resolves(15);

      const usage = await service.getAgentPlanUsage(ORGANIZATION_ID);

      expect(usage.limitSource).to.equal('system');
      expect(usage.withinLimitAgentIds).to.equal(null);
      expect(stubs.findOldestAgentIds.called).to.equal(false);
    });
  });

  describe('checkRuntimeLimits', () => {
    it('resolves the organization service level once for both checks', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.countOlderAgentsInOrganization.resolves(0);
      stubs.listConnectedIntegrationIdsForOrganization.resolves(['int-1']);

      const checks = await service.checkRuntimeLimits(ORGANIZATION_ID, 'agent-1', 'int-1');

      expect(checks).to.deep.equal({ agentWithinLimit: true, channelWithinLimit: true });
      expect(stubs.findById.callCount).to.equal(1);
    });

    it('skips the organization lookup entirely for self-hosted deployments', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);

      const checks = await service.checkRuntimeLimits(ORGANIZATION_ID, 'agent-1', 'int-1');

      expect(checks).to.deep.equal({ agentWithinLimit: true, channelWithinLimit: true });
      expect(stubs.findById.called).to.equal(false);
    });
  });

  describe('isChannelWithinLimit', () => {
    it('allows channels connected within the limit by connection order', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForOrganization.resolves(['int-1', 'int-2']);

      const withinLimit = await service.isChannelWithinLimit(ORGANIZATION_ID, 'int-2');

      expect(withinLimit).to.equal(true);
    });

    it('blocks channels connected beyond the limit by connection order', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForOrganization.resolves(['int-1', 'int-2', 'int-3']);

      const withinLimit = await service.isChannelWithinLimit(ORGANIZATION_ID, 'int-3');

      expect(withinLimit).to.equal(false);
    });
  });
});
