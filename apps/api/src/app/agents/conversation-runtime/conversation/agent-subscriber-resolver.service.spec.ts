import { AGENT_PLATFORM_PROVISION_SOURCE, AGENT_PROVISION_DATA_KEYS } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { AgentSubscriberResolver, BotAuthorSkippedError } from './agent-subscriber-resolver.service';

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
      find?: sinon.SinonStub;
      createOrUpdateSubscriberExecute?: sinon.SinonStub;
      createChannelEndpointExecute?: sinon.SinonStub;
      subscriberDelete?: sinon.SinonStub;
      trackAnalytics?: sinon.SinonStub;
      adoptPhantomsInto?: sinon.SinonStub;
    } = {}
  ) {
    const channelEndpointRepository = {
      findByPlatformIdentity: overrides.findByPlatformIdentity ?? sinon.stub().resolves(null),
    };
    const subscriberRepository = {
      findByPhone: overrides.findByPhone ?? sinon.stub().resolves([]),
      findByEmail: overrides.findByEmail ?? sinon.stub().resolves([]),
      find: overrides.find ?? sinon.stub().resolves([]),
      delete: overrides.subscriberDelete ?? sinon.stub().resolves(undefined),
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
    const adoptionService = {
      adoptPhantomsInto: overrides.adoptPhantomsInto ?? sinon.stub().resolves(undefined),
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
      createOrUpdateSubscriber as any,
      createChannelEndpoint as any,
      analyticsService as any,
      adoptionService as any,
      logger as any
    );

    return {
      resolver,
      channelEndpointRepository,
      subscriberRepository,
      createOrUpdateSubscriber,
      createChannelEndpoint,
      analyticsService,
      adoptionService,
      logger,
    };
  }

  describe('resolveSubscriber — WhatsApp phone resolution', () => {
    it('resolves when inbound phone has no + and subscriber has +', async () => {
      const { resolver, subscriberRepository, channelEndpointRepository } = makeResolver({
        findByPhone: sinon.stub().resolves([{ subscriberId: 'sub-1' }]),
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-1' });
      expect(
        subscriberRepository.findByPhone.calledOnceWith(
          'env-1',
          'org-1',
          ['+972541111111', '972541111111'],
          '^\\+?9\\D*7\\D*2\\D*5\\D*4\\D*1\\D*1\\D*1\\D*1\\D*1\\D*1\\D*1$'
        )
      ).to.equal(true);
      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
    });

    it('returns not_found when no subscriber matches', async () => {
      const { resolver } = makeResolver({ findByPhone: sinon.stub().resolves([]) });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.deep.equal({ outcome: 'not_found' });
    });

    it('warns and returns first match when multiple customer-created subscribers share the phone', async () => {
      const { resolver, logger } = makeResolver({
        findByPhone: sinon.stub().resolves([
          { _id: 'mongo-1', subscriberId: 'sub-1', data: {} },
          { _id: 'mongo-2', subscriberId: 'sub-2', data: {} },
        ]),
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-1' });
      expect(logger.warn.calledOnce).to.equal(true);
    });

    it('returns invalid_identity for empty platformUserId without DB call', async () => {
      const { resolver, subscriberRepository, channelEndpointRepository } = makeResolver();

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '   ',
      });

      expect(result).to.deep.equal({ outcome: 'invalid_identity' });
      expect(subscriberRepository.findByPhone.called).to.equal(false);
      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
    });

    it('returns invalid_identity for an unparseable phone without DB call', async () => {
      const { resolver, subscriberRepository } = makeResolver();

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: 'not-a-phone',
      });

      expect(result).to.deep.equal({ outcome: 'invalid_identity' });
      expect(subscriberRepository.findByPhone.called).to.equal(false);
    });
  });

  describe('resolveSubscriber - WhatsApp adoption / prefer customer-created', () => {
    const realMatch = {
      _id: 'mongo-real',
      subscriberId: 'sub-real',
      phone: '+972541111111',
      data: {},
    };
    const phantomMatch = {
      _id: 'mongo-phantom',
      subscriberId: 'sub-phantom',
      phone: '+972541111111',
      data: { [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE },
    };

    it('prefers the customer-created subscriber and adopts the phantom on a dual match', async () => {
      const adoptPhantomsInto = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({
        findByPhone: sinon.stub().resolves([phantomMatch, realMatch]),
        adoptPhantomsInto,
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '+972541111111',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-real' });
      expect(adoptPhantomsInto.calledOnce).to.equal(true);
      const arg = adoptPhantomsInto.firstCall.args[0];
      expect(arg.real).to.deep.equal({ _id: 'mongo-real', subscriberId: 'sub-real' });
      expect(arg.phantoms).to.deep.equal([{ _id: 'mongo-phantom', subscriberId: 'sub-phantom' }]);
    });

    it('resolves to the phantom and does not adopt when no customer-created subscriber exists', async () => {
      const adoptPhantomsInto = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({
        findByPhone: sinon.stub().resolves([phantomMatch]),
        adoptPhantomsInto,
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '+972541111111',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-phantom' });
      expect(adoptPhantomsInto.called).to.equal(false);
    });
  });

  describe('resolveSubscriber — Email resolution', () => {
    it('resolves when subscriber.email matches inbound address (lowercased)', async () => {
      const { resolver, subscriberRepository } = makeResolver({
        findByEmail: sinon.stub().resolves([{ subscriberId: 'sub-email' }]),
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'User@Example.com',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-email' });
      expect(subscriberRepository.findByEmail.calledOnceWith('env-1', 'org-1', 'user@example.com')).to.equal(true);
    });

    it('returns not_found when no subscriber matches', async () => {
      const { resolver } = makeResolver({ findByEmail: sinon.stub().resolves([]) });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'unknown@example.com',
      });

      expect(result).to.deep.equal({ outcome: 'not_found' });
    });

    it('returns invalid_identity for invalid email without DB call', async () => {
      const { resolver, subscriberRepository } = makeResolver();

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'not-an-email',
      });

      expect(result).to.deep.equal({ outcome: 'invalid_identity' });
      expect(subscriberRepository.findByEmail.called).to.equal(false);
    });

    it('propagates lookup errors instead of flattening them to a miss', async () => {
      const lookupError = new Error('mongo timeout');
      const { resolver } = makeResolver({ findByEmail: sinon.stub().rejects(lookupError) });

      try {
        await resolver.resolveSubscriber({
          ...baseLookupParams,
          platform: AgentPlatformEnum.EMAIL,
          platformUserId: 'user@example.com',
        });
        expect.fail('Expected the lookup error to propagate');
      } catch (err) {
        expect(err).to.equal(lookupError);
      }
    });
  });

  describe('resolveSubscriber — Email adoption / prefer customer-created', () => {
    const realMatch = { _id: 'mongo-real', subscriberId: 'sub-real', email: 'user@example.com', data: {} };
    const phantomMatch = {
      _id: 'mongo-phantom',
      subscriberId: 'sub-phantom',
      email: 'user@example.com',
      data: { [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE },
    };

    it('prefers the customer-created subscriber and adopts the phantom on a dual match', async () => {
      const adoptPhantomsInto = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({
        findByEmail: sinon.stub().resolves([phantomMatch, realMatch]),
        adoptPhantomsInto,
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'user@example.com',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-real' });
      expect(adoptPhantomsInto.calledOnce).to.equal(true);
      const arg = adoptPhantomsInto.firstCall.args[0];
      expect(arg.real).to.deep.equal({ _id: 'mongo-real', subscriberId: 'sub-real' });
      expect(arg.phantoms).to.deep.equal([{ _id: 'mongo-phantom', subscriberId: 'sub-phantom' }]);
    });

    it('resolves to the phantom and does not adopt when no customer-created subscriber exists', async () => {
      const adoptPhantomsInto = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({
        findByEmail: sinon.stub().resolves([phantomMatch]),
        adoptPhantomsInto,
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'user@example.com',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-phantom' });
      expect(adoptPhantomsInto.called).to.equal(false);
    });

    it('resolves to the customer-created subscriber without adoption when no phantom exists', async () => {
      const adoptPhantomsInto = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({
        findByEmail: sinon.stub().resolves([realMatch]),
        adoptPhantomsInto,
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'user@example.com',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-real' });
      expect(adoptPhantomsInto.called).to.equal(false);
    });
  });

  describe('provisionEmailSubscriber — lazy keyless demo provisioning', () => {
    it('creates a Subscriber with email + provenance and no ChannelEndpoint on a miss', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const trackAnalytics = sinon.stub();
      const { resolver, createChannelEndpoint } = makeResolver({
        find: sinon.stub().resolves([]),
        createOrUpdateSubscriberExecute,
        trackAnalytics,
      });

      const result = await resolver.provisionEmailSubscriber({
        ...baseLookupParams,
        agentIdentifier: 'agent-test',
        email: 'User@Example.com',
      });

      expect(result)
        .to.be.a('string')
        .and.to.match(/^sub_ap_/);
      expect(createOrUpdateSubscriberExecute.calledOnce).to.equal(true);

      const command = createOrUpdateSubscriberExecute.firstCall.args[0];
      expect(command.email).to.equal('user@example.com');
      expect(command.data[AGENT_PROVISION_DATA_KEYS.source]).to.equal(AGENT_PLATFORM_PROVISION_SOURCE);
      expect(command.data[AGENT_PROVISION_DATA_KEYS.platform]).to.equal(AgentPlatformEnum.EMAIL);
      expect(command.data[AGENT_PROVISION_DATA_KEYS.platformUserId]).to.equal('user@example.com');

      // Email identity lives on Subscriber.email — no ChannelEndpoint is written.
      expect(createChannelEndpoint.execute.called).to.equal(false);
      expect(trackAnalytics.calledOnce).to.equal(true);
    });

    it('returns an existing agent-provisioned subscriber without creating a new row', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const find = sinon.stub().resolves([{ subscriberId: 'sub-existing' }]);
      const { resolver } = makeResolver({
        find,
        createOrUpdateSubscriberExecute,
      });

      const result = await resolver.provisionEmailSubscriber({
        ...baseLookupParams,
        agentIdentifier: 'agent-test',
        email: 'existing@example.com',
      });

      expect(result).to.equal('sub-existing');
      expect(createOrUpdateSubscriberExecute.called).to.equal(false);
      expect(find.calledOnce).to.equal(true);
    });

    it('does not reuse a non-agent-provisioned subscriber with the same email', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({
        find: sinon.stub().resolves([]),
        createOrUpdateSubscriberExecute,
      });

      const result = await resolver.provisionEmailSubscriber({
        ...baseLookupParams,
        agentIdentifier: 'agent-test',
        email: 'customer@example.com',
      });

      expect(result)
        .to.be.a('string')
        .and.to.match(/^sub_ap_/);
      expect(createOrUpdateSubscriberExecute.calledOnce).to.equal(true);
    });

    it('reuses an agent-provisioned subscriber with a mixed-case stored email', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const find = sinon.stub().resolves([{ subscriberId: 'sub-mixed-case' }]);
      const { resolver } = makeResolver({
        find,
        createOrUpdateSubscriberExecute,
      });

      const result = await resolver.provisionEmailSubscriber({
        ...baseLookupParams,
        agentIdentifier: 'agent-test',
        email: 'user@example.com',
      });

      expect(result).to.equal('sub-mixed-case');
      expect(createOrUpdateSubscriberExecute.called).to.equal(false);

      const query = find.firstCall.args[0];
      expect(query.email.$regex).to.be.instanceOf(RegExp);
      expect(query[`data.${AGENT_PROVISION_DATA_KEYS.source}`]).to.equal(AGENT_PLATFORM_PROVISION_SOURCE);
    });

    it('is idempotent — the same email yields the same deterministic subscriberId', async () => {
      const { resolver } = makeResolver({ find: sinon.stub().resolves([]) });

      const first = await resolver.provisionEmailSubscriber({
        ...baseLookupParams,
        agentIdentifier: 'agent-test',
        email: 'user@example.com',
      });
      const second = await resolver.provisionEmailSubscriber({
        ...baseLookupParams,
        agentIdentifier: 'agent-test',
        email: 'USER@example.com',
      });

      expect(first).to.equal(second);
    });

    it('returns null for an invalid address without writing anything', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const { resolver, subscriberRepository } = makeResolver({ createOrUpdateSubscriberExecute });

      const result = await resolver.provisionEmailSubscriber({
        ...baseLookupParams,
        agentIdentifier: 'agent-test',
        email: 'not-an-email',
      });

      expect(result).to.equal(null);
      expect(subscriberRepository.findByEmail.called).to.equal(false);
      expect(createOrUpdateSubscriberExecute.called).to.equal(false);
    });
  });

  describe('resolveSubscriber — channel endpoint resolution', () => {
    it('resolves Slack via channel endpoints', async () => {
      const { resolver, channelEndpointRepository } = makeResolver({
        findByPlatformIdentity: sinon.stub().resolves({ subscriberId: 'sub-slack' }),
      });

      const result = await resolver.resolveSubscriber({
        ...baseLookupParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_LINKED',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-slack' });
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

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-existing' });
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

      expect(result.outcome).to.equal('resolved');
      const subscriberId = result.outcome === 'resolved' ? result.subscriberId : '';
      expect(subscriberId).to.match(/^sub_ap_/);
      expect(createOrUpdateSubscriber.execute.calledOnce).to.equal(true);
      const subscriberCommand = createOrUpdateSubscriber.execute.firstCall.args[0];
      expect(subscriberCommand.subscriberId).to.equal(subscriberId);
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
      expect(endpointCommand.subscriberId).to.equal(subscriberId);
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

      expect(first).to.deep.equal(second);
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
      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-winner' });
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
      expect(subscriberRepository.delete.firstCall.args[0].subscriberId).to.match(/^sub_ap_/);
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

  describe('resolveOrProvision — open-access email', () => {
    it('returns an existing subscriber without provisioning', async () => {
      const { resolver, createOrUpdateSubscriber } = makeResolver({
        findByEmail: sinon.stub().resolves([{ _id: 'mongo-1', subscriberId: 'sub-known', data: {} }]),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'known@example.com',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-known' });
      expect(createOrUpdateSubscriber.execute.called).to.equal(false);
    });

    it('provisions a phantom subscriber when the sender is unknown', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({
        findByEmail: sinon.stub().resolves([]),
        find: sinon.stub().resolves([]),
        createOrUpdateSubscriberExecute,
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'newcomer@example.com',
      });

      expect(result.outcome).to.equal('resolved');
      expect(result.outcome === 'resolved' ? result.subscriberId : '').to.match(/^sub_ap_/);
      expect(createOrUpdateSubscriberExecute.calledOnce).to.equal(true);
    });

    it('soft-fails to an error outcome when provisioning throws', async () => {
      const provisionError = new Error('mongo down');
      const { resolver, logger } = makeResolver({
        findByEmail: sinon.stub().resolves([]),
        find: sinon.stub().resolves([]),
        createOrUpdateSubscriberExecute: sinon.stub().rejects(provisionError),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'fail@example.com',
      });

      expect(result).to.deep.equal({ outcome: 'error', err: provisionError });
      expect(logger.warn.called).to.equal(true);
    });

    it('returns invalid_identity for an unusable address without provisioning', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({ createOrUpdateSubscriberExecute });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.EMAIL,
        platformUserId: 'not-an-email',
      });

      expect(result).to.deep.equal({ outcome: 'invalid_identity' });
      expect(createOrUpdateSubscriberExecute.called).to.equal(false);
    });
  });

  describe('resolveOrProvision - open-access WhatsApp', () => {
    it('returns an existing subscriber without provisioning', async () => {
      const { resolver, createOrUpdateSubscriber } = makeResolver({
        findByPhone: sinon.stub().resolves([{ _id: 'mongo-1', subscriberId: 'sub-known', data: {} }]),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '+972541111111',
      });

      expect(result).to.deep.equal({ outcome: 'resolved', subscriberId: 'sub-known' });
      expect(createOrUpdateSubscriber.execute.called).to.equal(false);
    });

    it('provisions a phantom subscriber when the sender is unknown', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const trackAnalytics = sinon.stub();
      const { resolver, createChannelEndpoint } = makeResolver({
        findByPhone: sinon.stub().resolves([]),
        createOrUpdateSubscriberExecute,
        trackAnalytics,
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result.outcome).to.equal('resolved');
      expect(result.outcome === 'resolved' ? result.subscriberId : '').to.match(/^sub_ap_/);
      expect(createOrUpdateSubscriberExecute.calledOnce).to.equal(true);
      const command = createOrUpdateSubscriberExecute.firstCall.args[0];
      expect(command.phone).to.equal('+972541111111');
      expect(command.data[AGENT_PROVISION_DATA_KEYS.platform]).to.equal(AgentPlatformEnum.WHATSAPP);
      expect(command.data[AGENT_PROVISION_DATA_KEYS.platformUserId]).to.equal('+972541111111');
      expect(createChannelEndpoint.execute.called).to.equal(false);
      expect(trackAnalytics.calledOnce).to.equal(true);
      expect(trackAnalytics.firstCall.args[0]).to.equal('[Agent Platform] - Subscriber auto-provisioned');
      expect(trackAnalytics.firstCall.args[2].platform).to.equal(AgentPlatformEnum.WHATSAPP);
    });

    it('soft-fails to an error outcome when provisioning throws', async () => {
      const provisionError = new Error('mongo down');
      const { resolver, logger } = makeResolver({
        findByPhone: sinon.stub().resolves([]),
        createOrUpdateSubscriberExecute: sinon.stub().rejects(provisionError),
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '+972541111111',
      });

      expect(result).to.deep.equal({ outcome: 'error', err: provisionError });
      expect(logger.warn.called).to.equal(true);
    });

    it('returns invalid_identity for an unusable phone without provisioning', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const { resolver } = makeResolver({ createOrUpdateSubscriberExecute });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: 'not-a-phone',
      });

      expect(result).to.deep.equal({ outcome: 'invalid_identity' });
      expect(createOrUpdateSubscriberExecute.called).to.equal(false);
    });
  });

  describe('resolveOrProvision - open-access Sendblue', () => {
    it('provisions a phantom subscriber when the sender is unknown', async () => {
      const createOrUpdateSubscriberExecute = sinon.stub().resolves(undefined);
      const trackAnalytics = sinon.stub();
      const { resolver, createChannelEndpoint } = makeResolver({
        findByPhone: sinon.stub().resolves([]),
        createOrUpdateSubscriberExecute,
        trackAnalytics,
      });

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.SENDBLUE,
        platformUserId: '15551234567',
      });

      expect(result.outcome).to.equal('resolved');
      expect(result.outcome === 'resolved' ? result.subscriberId : '').to.match(/^sub_ap_/);
      expect(createOrUpdateSubscriberExecute.calledOnce).to.equal(true);
      const command = createOrUpdateSubscriberExecute.firstCall.args[0];
      expect(command.phone).to.equal('+15551234567');
      expect(command.data[AGENT_PROVISION_DATA_KEYS.platform]).to.equal(AgentPlatformEnum.SENDBLUE);
      expect(createChannelEndpoint.execute.called).to.equal(false);
      expect(trackAnalytics.firstCall.args[2].platform).to.equal(AgentPlatformEnum.SENDBLUE);
    });
  });

  describe('resolveOrProvision — Telegram mirrors Slack/Teams', () => {
    it('creates a Subscriber + telegram_chat ChannelEndpoint when the chat identity is unrecognised', async () => {
      const { resolver, createOrUpdateSubscriber, createChannelEndpoint, analyticsService } = makeResolver();

      const result = await resolver.resolveOrProvision({
        ...baseProvisionParams,
        platform: AgentPlatformEnum.TELEGRAM,
        platformUserId: '777001',
      });

      expect(result.outcome).to.equal('resolved');
      const subscriberId = result.outcome === 'resolved' ? result.subscriberId : '';
      expect(subscriberId).to.match(/^sub_ap_/);
      expect(createOrUpdateSubscriber.execute.calledOnce).to.equal(true);
      expect(createOrUpdateSubscriber.execute.firstCall.args[0].data).to.deep.include({
        [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE,
        [AGENT_PROVISION_DATA_KEYS.platform]: AgentPlatformEnum.TELEGRAM,
        [AGENT_PROVISION_DATA_KEYS.platformUserId]: '777001',
      });

      expect(createChannelEndpoint.execute.calledOnce).to.equal(true);
      const endpointCommand = createChannelEndpoint.execute.firstCall.args[0];
      expect(endpointCommand.type).to.equal('telegram_chat');
      expect(endpointCommand.endpoint).to.deep.equal({ chatId: '777001' });

      const trackedEvents = analyticsService.track.getCalls().map((call) => call.args[0]);
      expect(trackedEvents).to.deep.equal(['[Agent Platform] - Subscriber auto-provisioned']);
    });
  });
});
