import { HumanInteractionKindEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { WhatsAppHeldRelease } from './whatsapp-held-release.service';

describe('WhatsAppHeldRelease', () => {
  const config = {
    environmentId: 'env1',
    organizationId: 'org1',
    platform: 'whatsapp',
    integrationIdentifier: 'whatsapp-main',
    isHumanRelay: true,
  };
  const hold = {
    subscriberId: 'ada',
    integrationIdentifier: 'whatsapp-main',
    platformThreadId: 'whatsapp:1234:15551234567',
    heldAt: '2026-11-12T10:00:00.000Z',
  };
  const interaction = (kind = HumanInteractionKindEnum.ASK, held = [hold]) => ({
    _id: 'hi-row',
    identifier: 'hi_1',
    kind,
    status: 'pending',
    content: { cardChrome: { title: 'Ship it?' } },
    subscriberIds: ['ada'],
    _agentId: 'agent1',
    held,
  });

  function setup(rows: unknown[], taken: unknown = hold) {
    const repository = {
      findHeldFor: sinon.stub().resolves(rows),
      takeHold: sinon.stub().resolves(taken),
      addDelivery: sinon.stub().resolves(),
      addHold: sinon.stub().resolves(),
      markDeliveredIfPending: sinon.stub().resolves(),
    };
    const conversations = { touchActivity: sinon.stub().resolves() };
    const gateway = {
      sendDirectMessage: sinon.stub().resolves({ messageId: 'wamid.real', platformThreadId: hold.platformThreadId }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const release = new WhatsAppHeldRelease(
      repository as never,
      conversations as never,
      gateway as never,
      logger as never
    );

    return { release, repository, conversations, gateway };
  }

  const scope = { agentId: 'agent1', config, subscriberId: 'ada', platformUserId: '15551234567' };

  it('sends what was held once they write, and records the delivery', async () => {
    const { release, repository, gateway } = setup([interaction()]);

    await release.release(scope);

    expect(repository.findHeldFor.firstCall.args.slice(0, 4)).to.deep.equal(['env1', 'org1', 'ada', 'whatsapp-main']);
    expect(gateway.sendDirectMessage.firstCall.args.slice(0, 3)).to.deep.equal([
      'agent1',
      'whatsapp-main',
      '15551234567',
    ]);
    expect(repository.addDelivery.firstCall.args[2]).to.deep.include({
      subscriberId: 'ada',
      platform: 'whatsapp',
      platformMessageId: 'wamid.real',
    });
    expect(repository.markDeliveredIfPending.called).to.equal(false);
  });

  it('marks a held plain message delivered once nobody is left waiting for it', async () => {
    const { release, repository } = setup([interaction(HumanInteractionKindEnum.TELL)]);

    await release.release(scope);

    expect(repository.markDeliveredIfPending.calledOnceWith('env1', 'hi-row')).to.equal(true);
  });

  it('sends nothing when another message took the hold first', async () => {
    const { release, gateway } = setup([interaction()], null);

    await release.release(scope);

    expect(gateway.sendDirectMessage.called).to.equal(false);
  });

  it('puts the hold back when the send fails, so their next message tries again', async () => {
    const { release, repository, gateway } = setup([interaction()]);
    gateway.sendDirectMessage.rejects(new Error('Meta down'));

    await release.release(scope);

    expect(repository.addHold.calledOnceWith('env1', 'hi-row', hold)).to.equal(true);
    expect(repository.addDelivery.called).to.equal(false);
  });

  it('marks the window open when a tap, not a message, released it', async () => {
    const { release, conversations } = setup([interaction()]);

    await release.release({ ...scope, conversationId: 'conv1' });

    expect(conversations.touchActivity.firstCall.args.slice(0, 3)).to.deep.equal(['env1', 'org1', 'conv1']);
    expect(conversations.touchActivity.firstCall.args[5]).to.have.property('humanMessageAt');
  });

  it('looks for nothing off WhatsApp, outside the relay, or for a stranger', async () => {
    const { release, repository } = setup([]);

    await release.release({ ...scope, config: { ...config, platform: 'telegram' } });
    await release.release({ ...scope, config: { ...config, isHumanRelay: false } });
    await release.release({ ...scope, subscriberId: null });

    expect(repository.findHeldFor.called).to.equal(false);
  });
});
