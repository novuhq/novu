import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import {
  WHATSAPP_BIND_DUPLICATE_REPLY,
  WHATSAPP_BIND_EXPIRED_REPLY,
  WHATSAPP_BIND_INVALID_REPLY,
  WHATSAPP_BIND_SUCCESS_REPLY,
  WHATSAPP_BIND_TOO_MANY_TRIES_REPLY,
  WhatsAppBindInbound,
} from './whatsapp-bind-inbound.service';

const CONFIG = {
  environmentId: 'env1',
  organizationId: 'org1',
  platform: AgentPlatformEnum.WHATSAPP,
  integrationIdentifier: 'whatsapp-main',
  integrationId: 'integration1',
  agentIdentifier: 'human-relay',
  isHumanRelay: true,
};
const PAYLOAD = {
  environmentId: 'env1',
  organizationId: 'org1',
  integrationId: 'integration1',
  agentIdentifier: 'human-relay',
  subscriberId: 'ada',
};

describe('WhatsAppBindInbound', () => {
  function setup({
    consumed = { status: 'consumed', payload: PAYLOAD } as unknown,
    bound = null as unknown,
    enabled = true,
  } = {}) {
    const codes = { consume: sinon.stub().resolves(consumed) };
    const bindWhatsAppNumber = { execute: sinon.stub().resolves({ created: true, subscriberId: 'ada' }) };
    const channelEndpointRepository = {
      findByPlatformIdentity: sinon.stub().resolves(bound),
      update: sinon.stub().resolves({ matched: 1, modified: 1 }),
    };
    const contactHandles = { refresh: sinon.stub().resolves() };
    const outboundGateway = { replyOnThread: sinon.stub().resolves() };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    const featureFlags = { getFlag: sinon.stub().resolves(enabled) };
    const heldRelease = { release: sinon.stub().resolves() };
    const service = new WhatsAppBindInbound(
      codes as never,
      bindWhatsAppNumber as never,
      channelEndpointRepository as never,
      contactHandles as never,
      outboundGateway as never,
      logger as never,
      featureFlags as never,
      heldRelease as never
    );

    return {
      service,
      codes,
      bindWhatsAppNumber,
      contactHandles,
      outboundGateway,
      channelEndpointRepository,
      heldRelease,
    };
  }

  function message(text: string, userId = '15550100199') {
    return { id: 'wamid-1', text, author: { userId, fullName: 'Ada Lovelace' } };
  }

  /** True when the message was used up here, with nothing left to go on with. */
  async function send(service: WhatsAppBindInbound, text: string, config: object = CONFIG) {
    return (await service.tryConsume('agent1', config as never, {} as never, message(text) as never)) === null;
  }

  function replied(outboundGateway: { replyOnThread: sinon.SinonStub }) {
    return outboundGateway.replyOnThread.firstCall.args[1].markdown;
  }

  it('binds the sender’s number in E.164 with the code they wrote, and says so', async () => {
    const { service, codes, bindWhatsAppNumber, contactHandles, outboundGateway } = setup();

    expect(await send(service, 'Connect me to ada: BCDF-GHJK')).to.equal(true);

    expect(codes.consume.firstCall.args).to.deep.equal(['integration1', 'BCDFGHJK', '+15550100199']);
    expect(bindWhatsAppNumber.execute.firstCall.args).to.deep.equal([PAYLOAD, '+15550100199']);
    expect(contactHandles.refresh.firstCall.args[0]).to.include({
      subscriberId: 'ada',
      platformUserId: '+15550100199',
    });
    expect(replied(outboundGateway)).to.equal(WHATSAPP_BIND_SUCCESS_REPLY);
  });

  it('binds nothing once WhatsApp is turned off for the organization, and lets the message go on', async () => {
    const { service, codes, outboundGateway } = setup({ enabled: false });

    expect(await send(service, 'Connect me to ada: BCDF-GHJK')).to.equal(false);
    expect(codes.consume.called).to.equal(false);
    expect(outboundGateway.replyOnThread.called).to.equal(false);
  });

  it('sends what was held for a connected contact who writes only a code, as nothing else would', async () => {
    const proved = {
      type: 'phone',
      providerId: 'whatsapp-business',
      subscriberId: 'ada',
      endpoint: { phoneNumber: '+15550100199', provedAt: '2026-11-01T10:00:00.000Z' },
    };
    const { service, heldRelease } = setup({ consumed: { status: 'missing' }, bound: proved });

    expect(await send(service, 'BCDF-GHJK')).to.equal(true);

    expect(heldRelease.release.calledOnce).to.equal(true);
    expect(heldRelease.release.firstCall.args[0]).to.deep.include({
      agentId: 'agent1',
      subscriberId: 'ada',
      platformUserId: '15550100199',
    });
  });

  it('leaves the release to the message that goes on, and releases nothing for a number nobody proved', async () => {
    const withMore = setup();
    const context = { skipped: [message('first question')], totalSinceLastHandler: 2 };
    await withMore.service.tryConsume(
      'agent1',
      CONFIG as never,
      {} as never,
      message('BCDF-GHJK') as never,
      context as never
    );
    const stranger = setup({ consumed: { status: 'missing' } });
    await send(stranger.service, 'BCDF-GHJK');

    expect(withMore.heldRelease.release.called).to.equal(false);
    expect(stranger.heldRelease.release.called).to.equal(false);
  });

  it('binds nobody from a plain hello: only the message that carries the code does', async () => {
    const { service, codes, bindWhatsAppNumber, outboundGateway } = setup();

    expect(await send(service, 'Hi')).to.equal(false);
    expect(codes.consume.called).to.equal(false);
    expect(bindWhatsAppNumber.execute.called).to.equal(false);
    expect(outboundGateway.replyOnThread.called).to.equal(false);
  });

  it('lets an ordinary message through untouched', async () => {
    const { service, codes, outboundGateway } = setup();

    expect(await send(service, 'yes, go ahead')).to.equal(false);
    expect(codes.consume.called).to.equal(false);
    expect(outboundGateway.replyOnThread.called).to.equal(false);
  });

  it('only listens on the relay’s WhatsApp', async () => {
    const { service, codes } = setup();

    expect(await send(service, 'BCDF-GHJK', { ...CONFIG, isHumanRelay: false })).to.equal(false);
    expect(await send(service, 'BCDF-GHJK', { ...CONFIG, platform: AgentPlatformEnum.TELEGRAM })).to.equal(false);
    expect(codes.consume.called).to.equal(false);
  });

  it('answers an expired code, and a number that is already bound', async () => {
    const expired = setup({ consumed: { status: 'missing' } });
    await send(expired.service, 'BCDF-GHJK');
    expect(replied(expired.outboundGateway)).to.equal(WHATSAPP_BIND_EXPIRED_REPLY);

    const already = setup({
      consumed: { status: 'missing' },
      bound: {
        _id: 'endpoint1',
        type: 'phone',
        providerId: 'whatsapp-business',
        endpoint: { phoneNumber: '+15550100199', provedAt: '2026-11-01T10:00:00.000Z' },
      },
    });
    await send(already.service, 'BCDF-GHJK');
    expect(replied(already.outboundGateway)).to.equal(WHATSAPP_BIND_DUPLICATE_REPLY);
  });

  it('answers a number that guessed too often', async () => {
    const { service, bindWhatsAppNumber, outboundGateway } = setup({ consumed: { status: 'too_many_tries' } });

    await send(service, 'BCDF-GHJK');

    expect(bindWhatsAppNumber.execute.called).to.equal(false);
    expect(replied(outboundGateway)).to.equal(WHATSAPP_BIND_TOO_MANY_TRIES_REPLY);
  });

  it('answers a code whose contact or channel is gone', async () => {
    const { service, bindWhatsAppNumber, outboundGateway } = setup();
    bindWhatsAppNumber.execute.rejects(new NotFoundException());

    expect(await send(service, 'BCDF-GHJK')).to.equal(true);
    expect(replied(outboundGateway)).to.equal(WHATSAPP_BIND_INVALID_REPLY);
  });

  it('uses a code held back in a burst, and lets the ordinary message after it through without the code', async () => {
    const { service, codes, outboundGateway } = setup();
    const codeMessage = message('Connect my WhatsApp: BCDF-GHJK');
    const context = { skipped: [codeMessage, message('first question')], totalSinceLastHandler: 3 };

    const latest = message('and another thing');
    const next = await service.tryConsume('agent1', CONFIG as never, {} as never, latest as never, context as never);

    expect(next).to.equal(latest);
    expect(codes.consume.calledOnce).to.equal(true);
    expect(replied(outboundGateway)).to.equal(WHATSAPP_BIND_SUCCESS_REPLY);
    expect(context.skipped.map((item) => item.text)).to.deep.equal(['first question']);
  });

  it('goes on with what they wrote before the code when the code came last', async () => {
    const { service, outboundGateway } = setup();
    const earlier = [message('first question'), message('and another thing')];
    const context = { skipped: [...earlier], totalSinceLastHandler: 3 };

    const next = await service.tryConsume(
      'agent1',
      CONFIG as never,
      {} as never,
      message('Connect my WhatsApp: BCDF-GHJK') as never,
      context as never
    );

    expect(replied(outboundGateway)).to.equal(WHATSAPP_BIND_SUCCESS_REPLY);
    expect(next).to.equal(earlier[1]);
    expect(context.skipped).to.deep.equal([earlier[0]]);
  });

  it('keeps when the number wrote a code, whatever became of it, as that opened WhatsApp’s window', async () => {
    const { service, channelEndpointRepository } = setup({ consumed: { status: 'missing' } });

    await send(service, 'Connect my WhatsApp: BCDF-GHJK');

    const [where, change] = channelEndpointRepository.update.firstCall.args;
    expect(where).to.deep.equal({
      _environmentId: 'env1',
      _organizationId: 'org1',
      integrationIdentifier: 'whatsapp-main',
      type: 'phone',
      'endpoint.phoneNumber': '+15550100199',
    });
    expect(change.$max['endpoint.lastCodeAt']).to.be.a('string');
    expect(change).to.not.have.property('$set');
  });

  it('keeps which business number that code went to, as the window it opened is with that number', async () => {
    const { service, channelEndpointRepository } = setup({ consumed: { status: 'missing' } });

    await send(service, 'Connect my WhatsApp: BCDF-GHJK', {
      ...CONFIG,
      credentials: { phoneNumberIdentification: '1234' },
    });

    expect(channelEndpointRepository.update.firstCall.args[1].$set).to.deep.equal({ 'endpoint.provedOn': '1234' });
  });
});
