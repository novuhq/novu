import { AgentIntegrationRepository, AgentRepository, CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, UNLIMITED_VALUE } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { PinoLogger } from '../logging';
import {
  AGENT_CREATION_GRACE,
  AgentEntitlementsService,
  isAgentOverPlanLimit,
  isChannelOverPlanLimit,
} from './agent-entitlements.service';
import { FeatureFlagsService } from './feature-flags';
import { SYSTEM_LIMITS } from './resource-validator.service';

const ORGANIZATION_ID = 'org-123';
const ENVIRONMENT_ID = 'env-456';

interface Stubs {
  getFlag: sinon.SinonStub;
  findById: sinon.SinonStub;
  countActiveInEnvironment: sinon.SinonStub;
  countTotalInEnvironment: sinon.SinonStub;
  countOlderAgentsInEnvironment: sinon.SinonStub;
  findOldestAgentIds: sinon.SinonStub;
  listConnectedIntegrationIdsForEnvironment: sinon.SinonStub;
}

function buildService(apiServiceLevel: ApiServiceLevelEnum): { service: AgentEntitlementsService; stubs: Stubs } {
  const getFlag = sinon.stub().resolves(SYSTEM_LIMITS.AGENTS);
  const findById = sinon.stub().resolves({ _id: ORGANIZATION_ID, apiServiceLevel });
  const countActiveInEnvironment = sinon.stub().resolves(0);
  const countTotalInEnvironment = sinon.stub().resolves(0);
  const countOlderAgentsInEnvironment = sinon.stub().resolves(0);
  const findOldestAgentIds = sinon.stub().resolves([]);
  const listConnectedIntegrationIdsForEnvironment = sinon.stub().resolves([]);

  const featureFlagsService = { getFlag } as unknown as FeatureFlagsService;
  const organizationRepository = { findById } as unknown as CommunityOrganizationRepository;
  const agentRepository = {
    countActiveInEnvironment,
    countTotalInEnvironment,
    countOlderAgentsInEnvironment,
    findOldestAgentIds,
  } as unknown as AgentRepository;
  const agentIntegrationRepository = {
    listConnectedIntegrationIdsForEnvironment,
  } as unknown as AgentIntegrationRepository;
  const logger = { setContext: sinon.stub(), warn: sinon.stub() } as unknown as PinoLogger;

  const service = new AgentEntitlementsService(
    featureFlagsService,
    organizationRepository,
    agentRepository,
    agentIntegrationRepository,
    logger
  );

  return {
    service,
    stubs: {
      getFlag,
      findById,
      countActiveInEnvironment,
      countTotalInEnvironment,
      countOlderAgentsInEnvironment,
      findOldestAgentIds,
      listConnectedIntegrationIdsForEnvironment,
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
      stubs.countTotalInEnvironment.resolves(10);

      const allowance = await service.canCreateAgent(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(allowance.allowed).to.equal(false);
      expect(allowance.creationLimit).to.equal(10);
      expect(allowance.limitSource).to.equal('system');
      expect(stubs.countTotalInEnvironment.calledWith(ORGANIZATION_ID, ENVIRONMENT_ID)).to.equal(true);
    });

    it('allows creation while below the creation limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(10);
      stubs.countTotalInEnvironment.resolves(9);

      const allowance = await service.canCreateAgent(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(allowance.allowed).to.equal(true);
    });

    it('always allows creation for self-hosted deployments', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);

      const allowance = await service.canCreateAgent(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(allowance.allowed).to.equal(true);
      expect(stubs.countTotalInEnvironment.called).to.equal(false);
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
      stubs.countOlderAgentsInEnvironment.resolves(1);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1');

      expect(withinLimit).to.equal(true);
      expect(stubs.countOlderAgentsInEnvironment.calledWith(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1')).to.equal(true);
    });

    it('blocks agents whose creation rank is at or beyond the limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.countOlderAgentsInEnvironment.resolves(3);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-4');

      expect(withinLimit).to.equal(false);
    });

    it('never blocks agents for system-capped unlimited tiers', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.ENTERPRISE);
      stubs.countOlderAgentsInEnvironment.resolves(SYSTEM_LIMITS.AGENTS + 5);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-over');

      expect(withinLimit).to.equal(true);
      expect(stubs.countOlderAgentsInEnvironment.called).to.equal(false);
    });

    it('never blocks agents under a LaunchDarkly per-org override, even when over it', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(10);
      stubs.countOlderAgentsInEnvironment.resolves(15);

      const withinLimit = await service.isAgentWithinLimit(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-over');

      expect(withinLimit).to.equal(true);
      expect(stubs.countOlderAgentsInEnvironment.called).to.equal(false);
    });
  });

  describe('getAgentPlanUsage', () => {
    it('lists within-limit agent ids when a plan-limited environment is over its limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.countActiveInEnvironment.resolves(3);
      stubs.countTotalInEnvironment.resolves(3);
      stubs.findOldestAgentIds.resolves(['agent-1', 'agent-2']);

      const usage = await service.getAgentPlanUsage(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(usage.limitSource).to.equal('plan');
      expect(usage.withinLimitAgentIds).to.deep.equal(['agent-1', 'agent-2']);
      expect(stubs.findOldestAgentIds.calledWith(ORGANIZATION_ID, ENVIRONMENT_ID, 2)).to.equal(true);
    });

    it('does not flag agents as over-limit for system-capped organizations', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.getFlag.resolves(10);
      stubs.countActiveInEnvironment.resolves(15);
      stubs.countTotalInEnvironment.resolves(15);

      const usage = await service.getAgentPlanUsage(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(usage.limitSource).to.equal('system');
      expect(usage.withinLimitAgentIds).to.equal(null);
      expect(stubs.findOldestAgentIds.called).to.equal(false);
    });
  });

  describe('checkRuntimeLimits', () => {
    it('resolves the organization service level once for both checks', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.countOlderAgentsInEnvironment.resolves(0);
      stubs.listConnectedIntegrationIdsForEnvironment.resolves(['int-1']);

      const checks = await service.checkRuntimeLimits(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1', 'int-1');

      expect(checks).to.deep.equal({ agentWithinLimit: true, channelWithinLimit: true });
      expect(stubs.findById.callCount).to.equal(1);
    });

    it('skips the organization lookup entirely for self-hosted deployments', async () => {
      process.env.IS_SELF_HOSTED = 'true';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);

      const checks = await service.checkRuntimeLimits(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1', 'int-1');

      expect(checks).to.deep.equal({ agentWithinLimit: true, channelWithinLimit: true });
      expect(stubs.findById.called).to.equal(false);
    });

    it('fails open (all within limit) when a lookup throws', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.findById.rejects(new Error('boom'));

      const checks = await service.checkRuntimeLimits(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1', 'int-1');

      expect(checks).to.deep.equal({ agentWithinLimit: true, channelWithinLimit: true });
    });

    it('serves repeated checks from the short-TTL cache without new lookups', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForEnvironment.resolves(['int-1']);

      const first = await service.checkRuntimeLimits(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1', 'int-1');
      const second = await service.checkRuntimeLimits(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1', 'int-1');

      expect(second).to.deep.equal(first);
      expect(stubs.findById.callCount).to.equal(1);
      expect(stubs.listConnectedIntegrationIdsForEnvironment.callCount).to.equal(1);
    });

    it('does not cache fail-open results', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.findById.onFirstCall().rejects(new Error('boom'));

      await service.checkRuntimeLimits(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1', 'int-1');
      await service.checkRuntimeLimits(ORGANIZATION_ID, ENVIRONMENT_ID, 'agent-1', 'int-1');

      expect(stubs.findById.callCount).to.equal(2);
    });
  });

  describe('getChannelPlanUsage', () => {
    it('reports headroom for unconnected channels while under the limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForEnvironment.resolves(['int-1']);

      const usage = await service.getChannelPlanUsage(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(usage.withinLimitIntegrationIds).to.equal(null);
      expect(usage.blocksUnconnectedChannels).to.equal(false);
    });

    it('blocks unconnected channels once the environment is at its limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForEnvironment.resolves(['int-1', 'int-2']);

      const usage = await service.getChannelPlanUsage(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(usage.withinLimitIntegrationIds).to.equal(null);
      expect(usage.blocksUnconnectedChannels).to.equal(true);
    });

    it('lists within-limit integrations when over the limit', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForEnvironment.resolves(['int-1', 'int-2', 'int-3']);

      const usage = await service.getChannelPlanUsage(ORGANIZATION_ID, ENVIRONMENT_ID);

      expect(usage.withinLimitIntegrationIds).to.deep.equal(['int-1', 'int-2']);
      expect(usage.blocksUnconnectedChannels).to.equal(true);
    });
  });

  describe('over-limit predicates', () => {
    const baseAgentUsage = {
      used: 3,
      limit: 2,
      totalCreated: 3,
      creationLimit: 7,
      limitSource: 'plan' as const,
    };

    it('flags only active agents outside the within-limit list', () => {
      const usage = { ...baseAgentUsage, withinLimitAgentIds: ['agent-1', 'agent-2'] };

      expect(isAgentOverPlanLimit(usage, { _id: 'agent-3', active: true })).to.equal(true);
      expect(isAgentOverPlanLimit(usage, { _id: 'agent-3', active: false })).to.equal(false);
      expect(isAgentOverPlanLimit(usage, { _id: 'agent-1', active: true })).to.equal(false);
    });

    it('never flags agents when the environment is within its limit', () => {
      const usage = { ...baseAgentUsage, withinLimitAgentIds: null };

      expect(isAgentOverPlanLimit(usage, { _id: 'agent-3', active: true })).to.equal(false);
    });

    it('flags connected channels outside the within-limit list and unconnected channels without headroom', () => {
      const usage = {
        used: 3,
        limit: 2,
        withinLimitIntegrationIds: ['int-1', 'int-2'],
        blocksUnconnectedChannels: true,
      };

      expect(isChannelOverPlanLimit(usage, { integrationId: 'int-3', connected: true })).to.equal(true);
      expect(isChannelOverPlanLimit(usage, { integrationId: 'int-1', connected: true })).to.equal(false);
      expect(isChannelOverPlanLimit(usage, { integrationId: 'int-new', connected: false })).to.equal(true);
    });
  });

  describe('isChannelWithinLimit', () => {
    it('allows channels connected within the limit by connection order', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForEnvironment.resolves(['int-1', 'int-2']);

      const withinLimit = await service.isChannelWithinLimit(ORGANIZATION_ID, ENVIRONMENT_ID, 'int-2');

      expect(withinLimit).to.equal(true);
      expect(stubs.listConnectedIntegrationIdsForEnvironment.calledWith(ORGANIZATION_ID, ENVIRONMENT_ID)).to.equal(
        true
      );
    });

    it('blocks channels connected beyond the limit by connection order', async () => {
      process.env.IS_SELF_HOSTED = 'false';
      const { service, stubs } = buildService(ApiServiceLevelEnum.FREE);
      stubs.listConnectedIntegrationIdsForEnvironment.resolves(['int-1', 'int-2', 'int-3']);

      const withinLimit = await service.isChannelWithinLimit(ORGANIZATION_ID, ENVIRONMENT_ID, 'int-3');

      expect(withinLimit).to.equal(false);
    });
  });
});
