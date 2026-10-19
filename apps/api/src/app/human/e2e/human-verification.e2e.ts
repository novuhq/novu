import { CacheService, encryptCredentials, MailFactory } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, type IEmailOptions } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const subscriberRepository = new SubscriberRepository();

describe('Human email verification code #novu-v2', () => {
  let session: UserSession;
  let agentId: string;
  const sent: IEmailOptions[] = [];

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    sent.length = 0;
    captureOutboundMail(sent);

    const subscriberId = `verifier-${Date.now()}`;
    const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    agentId = setupRes.body.data.agentId as string;
    await linkEmailChannel(session, agentId);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('verifies with the mailed code and then with the link', async () => {
    const address = `ada-${Date.now()}@example.com`;
    const subscriberId = `ada-${Date.now()}`;
    const mail = await requestVerification(session, subscriberId, address, sent);
    const anonymous = publicClient(session);

    const byCode = await anonymous.post('/v1/human/verify-code', { address, code: mail.code });
    expect(byCode.status).to.equal(200, JSON.stringify(byCode.data));
    expect(byCode.data.data.verified).to.equal(true);

    const byLink = await anonymous.post('/v1/human/verify', { token: mail.token });
    expect(byLink.status).to.equal(200, JSON.stringify(byLink.data));
    expect(byLink.data.data.verified).to.equal(true);

    const subscriber = await subscriberRepository.findOne({
      subscriberId,
      _environmentId: session.environment._id,
    });
    expect(subscriber?.email).to.equal(address);
  });

  it('verifies with the link and then with the same code', async () => {
    const address = `bea-${Date.now()}@example.com`;
    const subscriberId = `bea-${Date.now()}`;
    const mail = await requestVerification(session, subscriberId, address, sent);
    const anonymous = publicClient(session);

    const byLink = await anonymous.post('/v1/human/verify', { token: mail.token });
    expect(byLink.status).to.equal(200, JSON.stringify(byLink.data));

    const byCode = await anonymous.post('/v1/human/verify-code', { address, code: mail.code });
    expect(byCode.status).to.equal(200, JSON.stringify(byCode.data));
    expect(byCode.data.data.verified).to.equal(true);
  });

  it('rejects a wrong code and locks the slot after ten tries', async () => {
    const address = `cio-${Date.now()}@example.com`;
    const mail = await requestVerification(session, `cio-${Date.now()}`, address, sent);
    const anonymous = publicClient(session);

    for (let attempt = 0; attempt < 9; attempt++) {
      const wrong = await anonymous.post('/v1/human/verify-code', { address, code: '000000' });
      expect(wrong.status).to.equal(401, JSON.stringify(wrong.data));
      expect(errorCode(wrong.data)).to.equal('verification_code_invalid');
    }

    const tenth = await anonymous.post('/v1/human/verify-code', { address, code: '000000' });
    expect(tenth.status).to.equal(429, JSON.stringify(tenth.data));
    expect(errorCode(tenth.data)).to.equal('verification_code_too_many_tries');

    const locked = await anonymous.post('/v1/human/verify-code', { address, code: mail.code });
    expect(locked.status).to.equal(429, JSON.stringify(locked.data));
    expect(errorCode(locked.data)).to.equal('verification_code_too_many_tries');
  });

  it('rejects a code from before a resend', async () => {
    const address = `deo-${Date.now()}@example.com`;
    const subscriberId = `deo-${Date.now()}`;
    const first = await requestVerification(session, subscriberId, address, sent);
    await clearSendCooldown(session, agentId, subscriberId);

    const resent = await session.testAgent
      .post('/v1/human/verifications')
      .send({ subscriberId, via: 'email', address });
    expect(resent.status).to.equal(200, JSON.stringify(resent.body));
    const next = readMailedCode(sent[sent.length - 1]);
    expect(next.code).to.not.equal(first.code);

    const anonymous = publicClient(session);
    const stale = await anonymous.post('/v1/human/verify-code', { address, code: first.code });
    expect(stale.status).to.equal(409, JSON.stringify(stale.data));
    expect(errorCode(stale.data)).to.equal('verification_superseded');

    const current = await anonymous.post('/v1/human/verify-code', { address, code: next.code });
    expect(current.status).to.equal(200, JSON.stringify(current.data));
  });
});

async function linkEmailChannel(session: UserSession, agentId: string) {
  const outbound = await integrationRepository.create({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: EmailProviderIdEnum.Novu,
    channel: ChannelTypeEnum.EMAIL,
    credentials: encryptCredentials({}),
    active: true,
    identifier: `novu-verify-e2e-${Date.now()}`,
    priority: 1,
    primary: false,
    deleted: false,
  });
  const inbox = await integrationRepository.create({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: EmailProviderIdEnum.AgentEmailInbox,
    channel: ChannelTypeEnum.EMAIL,
    credentials: encryptCredentials({ outboundIntegrationId: outbound._id }),
    active: true,
    identifier: `inbox-verify-e2e-${Date.now()}`,
    priority: 1,
    primary: false,
    deleted: false,
  });

  await agentIntegrationRepository.create({
    _agentId: agentId,
    _integrationId: inbox._id,
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
  });
}

async function requestVerification(session: UserSession, subscriberId: string, address: string, sent: IEmailOptions[]) {
  const res = await session.testAgent.post('/v1/human/verifications').send({ subscriberId, via: 'email', address });
  expect(res.status).to.equal(200, JSON.stringify(res.body));
  expect(sent.length).to.be.greaterThan(0);

  return readMailedCode(sent[sent.length - 1]);
}

function readMailedCode(mail: IEmailOptions | undefined) {
  const text = `${mail?.text ?? ''}\n${mail?.html ?? ''}`;
  const code = text.match(/@agentinbox\.md #(\d{6})/)?.[1];
  const token = text.match(/\/verify\/([A-Za-z0-9]{32})/)?.[1];
  expect(code, text).to.be.a('string');
  expect(token, text).to.be.a('string');

  return { code: code as string, token: token as string };
}

function publicClient(session: UserSession) {
  return axios.create({ baseURL: session.serverUrl, validateStatus: () => true });
}

async function clearSendCooldown(session: UserSession, relayAgentId: string, subscriberId: string) {
  const cache = session.testServer?.getService(CacheService);
  await cache?.del(`human_verify_cooldown:{${session.environment._id}:${relayAgentId}:${subscriberId}:email}`);
}

function errorCode(body: { code?: unknown; message?: { code?: unknown } }): string | undefined {
  if (typeof body?.code === 'string') {
    return body.code;
  }
  if (typeof body?.message?.code === 'string') {
    return body.message.code;
  }

  return undefined;
}

function captureOutboundMail(captured: IEmailOptions[]): void {
  sinon.stub(MailFactory.prototype, 'getHandler').callsFake(
    () =>
      ({
        send: async (mail: IEmailOptions) => {
          captured.push(mail);

          return {};
        },
      }) as never
  );
}
