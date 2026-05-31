import { FeatureFlagsKeysEnum, OrganizationProductTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import {
  AGENT_PLATFORM_PROVISION_SOURCE,
  AGENT_PROVISION_DATA_KEYS,
  AgentSubscriberResolver,
  BotAuthorSkippedError,
  ConnectOrgSubscriberCapExceededError,
  DEFAULT_CONNECT_ORG_AUTO_PROVISIONED_SUBSCRIBERS_LIMIT,
} from './agent-subscriber-resolver.service';

const DUPLICATE_KEY_ERROR = Object.assign(new Error('duplicate key'), { code: 11000 });

describe('AgentSubscriberResolver', () => {
  const baseLookupParams = {
    environmentId: 'env-1',
    organizationId: 'org-1',
    integrationIdentifier: 'integration-main',
  };

  const baseProvisionParams = {
    ...baseLookupParams,
    agentIdentifier: 'agent-test',
    authorFullName: 'Alice Smith',
    authorUserName: 'alice',
    authorIsBot: false,
  };

  function makeResolver(
    overrides: {
      findByPlatformIdentity?: sinon.SinonStub;
      findByPhone?: sinon.SinonStub;
      findByEmail?: sinon.SinonStub;
      subscriberCount?: sinon.SinonStub;
      organizationFindById?: sinon.SinonStub;
      featureFlagGet?: sinon.SinonStub;
      createOrUpdateSubscriberExecute?: sinon.SinonStub;
      createChannelEndpointExecute?: sinon.SinonStub;
      subscriberDelete?: sinon.SinonStub;
      trackAnalytics?: sinon.SinonStub;
    } = {}
  ) {
    const channelEndpointRepository = {
      findByPlatformIdentity: overrides.findByPlatformIdentity ?? sinon.stub().resolves(null),
    };
    const subscriberRepository = {
      findByPhone: overrides.findByPhone ?? sinon.stub().resolves([]),
      findByEmail: overrides.findByEmail ?? sinon.stub().resolves([]),
      count: overrides.subscriberCount ?? sinon.stub().resolves(0),
      delete: overrides.subscriberDelete ?? sinon.stub().resolves(undefined),
    };
    const organizationRepository = {
      findById: overrides.organizationFindById ?? sinon.stub().resolves({ productType: undefined }),
    };
    const featureFlagsService = {
      getFlag:
        overrides.featureFlagGet ?? sinon.stub().resolves(DEFAULT_CONNECT_ORG_AUTO_PROVISIONED_SUBSCRIBERS_LIMIT),
    };
    const createOrUpdateSubscriber = {
      execute: overrides.createOrUpdateSubscriberExecute ?? sinon.stub().resolves(undefined),
    };
    const createChannelEndpoint = {
      execute: overrides.createChannelEndpointExecute ?? sinon.stub().resolves(undefined),
    };
    const analyticsService = {
      track: overrides.trackAnalytics ?? sinon.stub(),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const resolver = new AgentSubscriberResolver(
      channelEndpointRepository as any,
      subscriberRepository as any,
      organizationRepository as any,
      featureFlagsService as any,
      createOrUpdateSubscriber as any,
      createChannelEndpoint as any,
      analyticsService as any,
      logger as any
    );

    return {
      resolver,
      channelEndpointRepository,
      subscriberRepository,
      organizationRepository,
      featureFlagsService,
      createOrUpdateSubscriber,
      createChannelEndpoint,
      analyticsService,
      logger,
    };
  }

  describe('resolveOnly — WhatsApp phone resolution', () => {
    it('resolves when inbound phone has no + and subscriber has +', async () => {
      const { resolver, subscriberRepository, channelEndpointRepository } = makeResolver({
        findByPhone: sinon.stub().resolves([{ subscriberId: 'sub-1' }]),
      });

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.equal('sub-1');
      expect(
        subscriberRepository.findByPhone.calledOnceWith('env-1', 'org-1', ['+972541111111', '972541111111'])
      ).to.equal(true);
      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
    });

    it('returns null when no subscriber matches', async () => {
      const { resolver } = makeResolver({ findByPhone: sinon.stub().resolves([]) });

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.equal(null);
    });

    it('warns and returns first match when multiple subscribers share the phone', async () => {
      const { resolver, logger } = makeResolver({
        findByPhone: sinon.stub().resolves([{ subscriberId: 'sub-1' }, { subscriberId: 'sub-2' }]),
      });

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.equal('sub-1');
      expect(logger.warn.calledOnce).to.equal(true);
    });

    it('returns null for empty platformUserId without DB call', async () => {
      const { resolver, subscriberRepository, channelEndpointRepository } = makeResolver();

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '   ',
      });

      expect(result).to.equal(null);
      expect(subscriberRepository.findByPhone.called).to.equal(false);
      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
    });
  });

  describe('resolveOnly — Email resolution', () => {
    it('resolves when subscriber.email matches inbound address (lowercased)', async () => {
      const { resolver, subscriberRepository } = makeResolver({
        findByEmail: sinon.stub().resolves([{ subscriberId: 'sub-email' }]),
      });

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'User@Example.com',
      });

      expect(result).to.equal('sub-email');
      expect(subscriberRepository.findByEmail.calledOnceWith('env-1', 'org-1', 'user@example.com')).to.equal(true);
    });

    it('returns null when no subscriber matches', async () => {
      const { resolver } = makeResolver({ findByEmail: sinon.stub().resolves([]) });

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'unknown@example.com',
      });

      expect(result).to.equal(null);
    });

    it('returns null for invalid email without DB call', async () => {
      const { resolver, subscriberRepository } = makeResolver();

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'not-an-email',
      });

      expect(result).to.equal(null);
      expect(subscriberRepository.findByEmail.called).to.equal(false);
    });
  });

  describe('resolveOnly — channel endpoint resolution', () => {
    it('resolves Slack via channel endpoints', async () => {
      const { resolver, channelEndpointRepository } = makeResolver({
        findByPlatformIdentity: sinon.stub().resolves({ subscriberId: 'sub-slack' }),
      });

      const result = await resolver.resolveOnly({
        ...baseLookupParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_LINKED',
      });

      expect(result).to.equal('sub-slack');
      expect(channelEndpointRepository.findByPlatformIdentity.calledOnce).to.equal(true);
    });
  });

  describe('resolveOrProvision — Slack happy path', () => {
    it('returns existing subscriber when channel endpoint already binds the platform identity', async () => {
      const { resolver, createOrUpdateSubscriber, createChannelEndpoint, analyticsService } = makeResolver({
        findByPlatformIdentity: sinon.stub().resolves({ subscriberId: 'sub-existing' }),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_EXISTING',
      });

      expect(result).to.equal('sub-existing');
      expect(createOrUpdateSubscriber.execute.called).to.equal(false);
      expect(createChannelEndpoint.execute.called).to.equal(false);
      expect(analyticsService.track.called).to.equal(false);
    });

    it('creates a new Subscriber + ChannelEndpoint when the platform identity is unrecognised', async () => {
      const { resolver, createOrUpdateSubscriber, createChannelEndpoint, analyticsService } = makeResolver();

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_NEW',
      });

      expect(result).to.match(/^sub_/);
      expect(createOrUpdateSubscriber.execute.calledOnce).to.equal(true);
      const subscriberCommand = createOrUpdateSubscriber.execute.firstCall.args[0];
      expect(subscriberCommand.subscriberId).to.equal(result);
      expect(subscriberCommand.firstName).to.equal('Alice Smith');
      expect(subscriberCommand.data).to.deep.include({
        [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE,
        [AGENT_PROVISION_DATA_KEYS.platform]: AgentPlatformEnum.SLACK,
        [AGENT_PROVISION_DATA_KEYS.platformUserId]: 'U_NEW',
        [AGENT_PROVISION_DATA_KEYS.agentIdentifier]: 'agent-test',
      });
      expect(typeof subscriberCommand.data[AGENT_PROVISION_DATA_KEYS.firstSeenAt]).to.equal('string');

      expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
      const endpointCommand = createChannelEndpoint.execute.firstCall.args[0];
      expect(endpointCommand.subscriberId).to.equal(result);
      expect(endpointCommand.type).to.equal('slack_user');
      expect(endpointCommand.endpoint).to.deep.equal({ userId: 'U_NEW' });

      const trackedEvents = analyticsService.track.getCalls().map((call) => call.args[0]);
      expect(trackedEvents).to.deep.equal(['[Agent Platform] - Subscriber auto-provisioned']);
    });

    it('derives the same subscriberId across calls for the same platform identity tuple', async () => {
      const { resolver: r1, createOrUpdateSubscriber: u1 } = makeResolver();
      const { resolver: r2, createOrUpdateSubscriber: u2 } = makeResolver();

      const first = await r1.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_DETERMINISTIC',
      });
      const second = await r2.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_DETERMINISTIC',
      });

      expect(first).to.equal(second);
      expect(u1.execute.firstCall.args[0].subscriberId).to.equal(u2.execute.firstCall.args[0].subscriberId);
    });

    it('falls back to authorUserName when authorFullName is missing', async () => {
      const { resolver, createOrUpdateSubscriber } = makeResolver();

      await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_NEW',
        authorFullName: null,
      });

      const subscriberCommand = createOrUpdateSubscriber.execute.firstCall.args[0];
      expect(subscriberCommand.firstName).to.equal('alice');
    });
  });

  describe('resolveOrProvision — Teams mirrors Slack', () => {
    it('writes a ms_teams_user endpoint type when provisioning for Teams', async () => {
      const { resolver, createChannelEndpoint } = makeResolver();

      await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.TEAMS,
        platformUserId: 'teams-user-1',
      });

      expect(createChannelEndpoint.execute.firstCall.args[0].type).to.equal('ms_teams_user');
    });
  });

  describe('resolveOrProvision — bot author short-circuit', () => {
    it('throws BotAuthorSkippedError and writes nothing when authorIsBot is true', async () => {
      const { resolver, createOrUpdateSubscriber, createChannelEndpoint, analyticsService, channelEndpointRepository } =
        makeResolver();

      try {
        await resolver.resolveOrProvision({
          ...baseProvisionParams,
          platform: AgentPlatformEnum.SLACK,
          platformUserId: 'U_BOT',
          authorIsBot: true,
        });
        expect.fail('Expected BotAuthorSkippedError');
      } catch (err) {
        expect(err).to.be.instanceof(BotAuthorSkippedError);
      }

      // Bot check runs BEFORE the lookup so bot-authored messages never reach
      // the bridge — no DB lookups, no provisioning writes.
      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
      expect(createOrUpdateSubscriber.execute.called).to.equal(false);
      expect(createChannelEndpoint.execute.called).to.equal(false);
      const trackedEvents = analyticsService.track.getCalls().map((call) => call.args[0]);
      expect(trackedEvents).to.deep.equal(['[Agent Platform] - Bot author inbound skipped']);
    });

    it('rejects already-linked bot identities — bot check runs before the platform-identity lookup', async () => {
      const { resolver, channelEndpointRepository } = makeResolver({
        findByPlatformIdentity: sinon.stub().resolves({ subscriberId: 'sub-linked' }),
      });

      try {
        await resolver.resolveOrProvision({
          ...baseProvisionParams,
          platform: AgentPlatformEnum.SLACK,
          platformUserId: 'U_LINKED_BOT',
          authorIsBot: true,
        });
        expect.fail('Expected BotAuthorSkippedError even for an already-linked identity');
      } catch (err) {
        expect(err).to.be.instanceof(BotAuthorSkippedError);
      }

      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
    });
  });

  describe('resolveOrProvision — Connect-org cap', () => {
    it('throws ConnectOrgSubscriberCapExceededError when the org is CONNECT and at cap', async () => {
      const subscriberCount = sinon.stub().resolves(25);
      const { resolver, createOrUpdateSubscriber, createChannelEndpoint, analyticsService, featureFlagsService } =
        makeResolver({
          organizationFindById: sinon.stub().resolves({ productType: OrganizationProductTypeEnum.CONNECT }),
          featureFlagGet: sinon.stub().resolves(25),
          subscriberCount,
        });

      try {
        await resolver.resolveOrProvision({
          ...baseProvisionParams,
          platform: AgentPlatformEnum.SLACK,
          platformUserId: 'U_OVERFLOW',
        });
        expect.fail('Expected ConnectOrgSubscriberCapExceededError');
      } catch (err) {
        expect(err).to.be.instanceof(ConnectOrgSubscriberCapExceededError);
        expect((err as ConnectOrgSubscriberCapExceededError).limit).to.equal(25);
        expect((err as ConnectOrgSubscriberCapExceededError).count).to.equal(25);
      }

      expect(createOrUpdateSubscriber.execute.called).to.equal(false);
      expect(createChannelEndpoint.execute.called).to.equal(false);

      const trackedEvents = analyticsService.track.getCalls().map((call) => call.args[0]);
      expect(trackedEvents).to.deep.equal(['[Agent Platform] - Connect org subscriber cap reached']);

      const flagCall = featureFlagsService.getFlag.firstCall.args[0];
      expect(flagCall.key).to.equal(FeatureFlagsKeysEnum.MAX_CONNECT_ORG_AUTO_PROVISIONED_SUBSCRIBERS_NUMBER);

      // The cap query MUST pass a bounded `limit + 1` second argument so we
      // don't degrade to a full-collection countDocuments on large orgs.
      expect(subscriberCount.firstCall.args[1]).to.equal(26);
    });

    it('allows provisioning when CONNECT org is under the cap', async () => {
      const { resolver, createOrUpdateSubscriber, createChannelEndpoint } = makeResolver({
        organizationFindById: sinon.stub().resolves({ productType: OrganizationProductTypeEnum.CONNECT }),
        featureFlagGet: sinon.stub().resolves(25),
        subscriberCount: sinon.stub().resolves(24),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_UNDER_CAP',
      });

      expect(result).to.match(/^sub_/);
      expect(createOrUpdateSubscriber.execute.calledOnce).to.equal(true);
      expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
    });

    it('does not enforce the cap for non-CONNECT orgs even when subscriber counts are high', async () => {
      const { resolver, createOrUpdateSubscriber, subscriberRepository, featureFlagsService } = makeResolver({
        organizationFindById: sinon.stub().resolves({ productType: OrganizationProductTypeEnum.PLATFORM }),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_PLATFORM_ORG',
      });

      expect(result).to.match(/^sub_/);
      expect(createOrUpdateSubscriber.execute.calledOnce).to.equal(true);
      expect(subscriberRepository.count.called).to.equal(false);
      expect(featureFlagsService.getFlag.called).to.equal(false);
    });
  });

  describe('resolveOrProvision — race-loser handling', () => {
    it('re-reads the winner ChannelEndpoint and returns its subscriberId on E11000', async () => {
      const winner = { subscriberId: 'sub-winner' };
      const findByPlatformIdentity = sinon.stub();
      findByPlatformIdentity.onFirstCall().resolves(null);
      findByPlatformIdentity.onSecondCall().resolves(winner);

      const { resolver, createChannelEndpoint, logger } = makeResolver({
        findByPlatformIdentity,
        createChannelEndpointExecute: sinon.stub().rejects(DUPLICATE_KEY_ERROR),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_RACE',
      });

      // Under deterministic subscriberIds the winner's id matches what we
      // would have generated locally, so returning the winner's row
      // converges every racer on a single `Subscriber` without leaving
      // orphan rows behind to log or clean up.
      expect(result).to.equal('sub-winner');
      expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
      expect(findByPlatformIdentity.callCount).to.equal(2);

      const debugMessages = logger.debug.getCalls().map((call) => String(call.args[0]));
      expect(debugMessages.some((message) => message.includes('race loser'))).to.equal(true);
    });

    it('re-throws non-duplicate errors from createChannelEndpoint and rolls back the subscriber', async () => {
      const otherError = new Error('integration not found');
      const subscriberDelete = sinon.stub().resolves(undefined);
      const { resolver, subscriberRepository } = makeResolver({
        createChannelEndpointExecute: sinon.stub().rejects(otherError),
        subscriberDelete,
      });

      try {
        await resolver.resolveOrProvision({
          ...baseProvisionParams,
          platform: AgentPlatformEnum.SLACK,
          platformUserId: 'U_OTHER_ERR',
        });
        expect.fail('Expected the non-duplicate error to propagate');
      } catch (err) {
        expect(err).to.equal(otherError);
      }

      expect(subscriberRepository.delete.calledOnce).to.equal(true);
      expect(subscriberRepository.delete.firstCall.args[0].subscriberId).to.match(/^sub_/);
      expect(subscriberRepository.delete.firstCall.args[0][`data.${AGENT_PROVISION_DATA_KEYS.source}`]).to.equal(
        AGENT_PLATFORM_PROVISION_SOURCE
      );
    });

    it('re-throws the original duplicate-key error when no winner row is visible after the race', async () => {
      const findByPlatformIdentity = sinon.stub().resolves(null);

      const { resolver } = makeResolver({
        findByPlatformIdentity,
        createChannelEndpointExecute: sinon.stub().rejects(DUPLICATE_KEY_ERROR),
      });

      try {
        await resolver.resolveOrProvision({
          ...baseProvisionParams,
          platform: AgentPlatformEnum.SLACK,
          platformUserId: 'U_NO_WINNER',
        });
        expect.fail('Expected the duplicate-key error to propagate when winner is missing');
      } catch (err) {
        expect(err).to.equal(DUPLICATE_KEY_ERROR);
      }
    });
  });

  describe('resolveOrProvision — unsupported platforms', () => {
    it('throws when called with WhatsApp', async () => {
      const { resolver } = makeResolver();

      try {
        await resolver.resolveOrProvision({
          ...baseProvisionParams,
          platform: AgentPlatformEnum.WHATSAPP,
          platformUserId: '+972541111111',
        });
        expect.fail('Expected resolveOrProvision to refuse non-Slack/Teams platforms');
      } catch (err) {
        expect((err as Error).message).to.contain('unsupported platform');
      }
    });

    it('throws when called with Telegram', async () => {
      const { resolver } = makeResolver();

      try {
        await resolver.resolveOrProvision({
          ...baseProvisionParams,
          platform: AgentPlatformEnum.TELEGRAM,
          platformUserId: '12345',
        });
        expect.fail('Expected resolveOrProvision to refuse Telegram');
      } catch (err) {
        expect((err as Error).message).to.contain('unsupported platform');
      }
    });
  });
});
