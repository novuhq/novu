import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { AgentSubscriberResolver } from './agent-subscriber-resolver.service';

describe('AgentSubscriberResolver', () => {
  const baseParams = {
    environmentId: 'env-1',
    organizationId: 'org-1',
    integrationIdentifier: 'integration-main',
  };

  function makeResolver(
    overrides: {
      findByPlatformIdentity?: sinon.SinonStub;
      findByPhone?: sinon.SinonStub;
    } = {}
  ) {
    const channelEndpointRepository = {
      findByPlatformIdentity: overrides.findByPlatformIdentity ?? sinon.stub().resolves(null),
    };
    const subscriberRepository = {
      findByPhone: overrides.findByPhone ?? sinon.stub().resolves([]),
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
      logger as any
    );

    return { resolver, channelEndpointRepository, subscriberRepository, logger };
  }

  describe('WhatsApp phone resolution', () => {
    it('should resolve when inbound phone has no + and subscriber has +', async () => {
      const { resolver, subscriberRepository, channelEndpointRepository } = makeResolver({
        findByPhone: sinon.stub().resolves([{ subscriberId: 'sub-1' }]),
      });

      const result = await resolver.resolve({
        ...baseParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.equal('sub-1');
      expect(subscriberRepository.findByPhone.calledOnceWith('env-1', 'org-1', ['+972541111111', '972541111111'])).to
        .equal(true);
      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
    });

    it('should resolve when inbound phone has + and subscriber has +', async () => {
      const { resolver, subscriberRepository } = makeResolver({
        findByPhone: sinon.stub().resolves([{ subscriberId: 'sub-1' }]),
      });

      const result = await resolver.resolve({
        ...baseParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '+972541111111',
      });

      expect(result).to.equal('sub-1');
      expect(subscriberRepository.findByPhone.calledOnceWith('env-1', 'org-1', ['+972541111111', '972541111111'])).to
        .equal(true);
    });

    it('should return null when no subscriber matches', async () => {
      const { resolver } = makeResolver({
        findByPhone: sinon.stub().resolves([]),
      });

      const result = await resolver.resolve({
        ...baseParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.equal(null);
    });

    it('should warn and return first match when multiple subscribers share the phone', async () => {
      const { resolver, logger } = makeResolver({
        findByPhone: sinon.stub().resolves([{ subscriberId: 'sub-1' }, { subscriberId: 'sub-2' }]),
      });

      const result = await resolver.resolve({
        ...baseParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '972541111111',
      });

      expect(result).to.equal('sub-1');
      expect(logger.warn.calledOnce).to.equal(true);
    });

    it('should return null for empty platformUserId without DB call', async () => {
      const { resolver, subscriberRepository, channelEndpointRepository } = makeResolver();

      const result = await resolver.resolve({
        ...baseParams,
        platform: AgentPlatformEnum.WHATSAPP,
        platformUserId: '   ',
      });

      expect(result).to.equal(null);
      expect(subscriberRepository.findByPhone.called).to.equal(false);
      expect(channelEndpointRepository.findByPlatformIdentity.called).to.equal(false);
    });
  });

  describe('channel endpoint resolution', () => {
    it('should resolve Slack via channel endpoints', async () => {
      const { resolver, channelEndpointRepository, subscriberRepository } = makeResolver({
        findByPlatformIdentity: sinon.stub().resolves({ subscriberId: 'sub-slack' }),
      });

      const result = await resolver.resolve({
        ...baseParams,
        platform: AgentPlatformEnum.SLACK,
        platformUserId: 'U_LINKED',
      });

      expect(result).to.equal('sub-slack');
      expect(channelEndpointRepository.findByPlatformIdentity.calledOnce).to.equal(true);
      expect(subscriberRepository.findByPhone.called).to.equal(false);
    });
  });
});
