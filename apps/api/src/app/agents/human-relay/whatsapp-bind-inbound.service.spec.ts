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
  function setup({ consumed = { status: 'consumed', payload: PAYLOAD } as unknown, bound = null as unknown } = {}) {
    const codes = { consume: sinon.stub().resolves(consumed) };
    const bindWhatsAppNumber = { execute: sinon.stub().resolves({ created: true, subscriberId: 'ada' }) };
    const channelEndpointRepository = { findByPlatformIdentity: sinon.stub().resolves(bound) };
    const contactHandles = { refresh: sinon.stub().resolves() };
    const outboundGateway = { replyOnThread: sinon.stub().resolves() };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    const service = new WhatsAppBindInbound(
      codes as never,
      bindWhatsAppNumber as never,
      channelEndpointRepository as never,
      contactHandles as never,
      outboundGateway as never,
      logger as never
    );

    return { service, codes, bindWhatsAppNumber, contactHandles, outboundGateway };
  }

  function message(text: string, userId = '15550100199') {
    return { id: 'wamid-1', text, author: { userId, fullName: 'Ada Lovelace' } };
  }

  async function send(service: WhatsAppBindInbound, text: string, config: object = CONFIG) {
    return service.tryConsume('agent1', config as never, {} as never, message(text) as never);
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

    const already = setup({ consumed: { status: 'missing' }, bound: { _id: 'endpoint1' } });
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
});
