import { encryptCredentials } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { WHATSAPP_CUSTOMER_WINDOW_MS, WhatsAppWindowService, windowFrom } from './whatsapp-window.service';

const SCOPE = { environmentId: 'env1', organizationId: 'org1' };
const INTEGRATION = {
  _id: 'int-wa',
  credentials: encryptCredentials({ phoneNumberIdentification: '1234', apiToken: 'EAAG' } as never),
};

describe('WhatsAppWindowService', () => {
  afterEach(() => {
    sinon.restore();
  });

  function setup(lastMessages: Record<string, string> = {}) {
    const conversationRepository = {
      findLastHumanMessageAtByPlatformThreads: sinon.stub().resolves(new Map(Object.entries(lastMessages))),
    };

    return { service: new WhatsAppWindowService(conversationRepository as never), conversationRepository };
  }

  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('reads the person’s thread with the business number by their wa_id, across every agent on it', async () => {
    const { service, conversationRepository } = setup();

    await service.describe(SCOPE, INTEGRATION as never, { waId: '15551234567' });

    expect(conversationRepository.findLastHumanMessageAtByPlatformThreads.firstCall.args).to.deep.equal([
      'env1',
      'org1',
      'int-wa',
      ['whatsapp:1234:15551234567'],
    ]);
  });

  it('is open within 24 hours of their last message, and says when it shuts', async () => {
    const lastMessageAt = ago(60 * 60 * 1000);
    const { service } = setup({ 'whatsapp:1234:15551234567': lastMessageAt });

    const window = await service.describe(SCOPE, INTEGRATION as never, { waId: '15551234567' });

    expect(window).to.deep.equal({
      open: true,
      lastMessageAt,
      closesAt: new Date(Date.parse(lastMessageAt) + WHATSAPP_CUSTOMER_WINDOW_MS).toISOString(),
    });
  });

  it('is shut 24 hours after their last message', async () => {
    const { service } = setup({ 'whatsapp:1234:15551234567': ago(WHATSAPP_CUSTOMER_WINDOW_MS + 60_000) });

    expect((await service.describe(SCOPE, INTEGRATION as never, { waId: '15551234567' })).open).to.equal(false);
  });

  it('counts the code that proved their number as a message, since it opened the window too', async () => {
    const provedAt = ago(5 * 60 * 1000);
    const { service } = setup({ 'whatsapp:1234:15551234567': ago(3 * WHATSAPP_CUSTOMER_WINDOW_MS) });

    const window = await service.describe(SCOPE, INTEGRATION as never, { waId: '15551234567', provedAt });

    expect(window).to.include({ open: true, lastMessageAt: provedAt });
  });

  it('is shut for someone who never wrote', async () => {
    const { service } = setup();

    expect(await service.describe(SCOPE, INTEGRATION as never, { waId: '15551234567' })).to.deep.equal({ open: false });
  });

  it('reads many people on one business number in one go', async () => {
    const recent = ago(60_000);
    const { service, conversationRepository } = setup({ 'whatsapp:1234:111': recent });

    const windows = await service.describeMany(SCOPE, INTEGRATION as never, [{ waId: '111' }, { waId: '222' }]);

    expect(conversationRepository.findLastHumanMessageAtByPlatformThreads.calledOnce).to.equal(true);
    expect(windows.get('111')?.open).to.equal(true);
    expect(windows.get('222')).to.deep.equal({ open: false });
  });

  it('works out a window from a thread’s last message', () => {
    expect(windowFrom(undefined)).to.deep.equal({ open: false });
    expect(windowFrom(ago(1000)).open).to.equal(true);
  });
});
