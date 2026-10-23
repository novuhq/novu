import { MailFactory } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanVerificationEmailSender } from './human-verification-email.sender';

describe('HumanVerificationEmailSender', () => {
  const savedEnv = {
    HUMAN_DASHBOARD_URL: process.env.HUMAN_DASHBOARD_URL,
    NOVU_REGION: process.env.NOVU_REGION,
    KEYLESS_ORGANIZATION_ID: process.env.KEYLESS_ORGANIZATION_ID,
  };

  let handlerSend: sinon.SinonStub;

  beforeEach(() => {
    process.env.HUMAN_DASHBOARD_URL = 'https://agentinbox.md/';
    process.env.NOVU_REGION = 'eu-central-1';
    delete process.env.KEYLESS_ORGANIZATION_ID;

    handlerSend = sinon.stub().resolves();
    sinon.stub(MailFactory.prototype, 'getHandler').returns({ send: handlerSend } as never);
  });

  afterEach(() => {
    sinon.restore();

    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('sends a verification link without a region, including from an EU API', async () => {
    const sender = new HumanVerificationEmailSender(
      { findOne: sinon.stub().resolves({ _id: 'agent-1', name: 'Acme Ops' }) } as never,
      { findOne: sinon.stub().resolves(null) } as never,
      { findForAgent: sinon.stub().resolves(null) } as never,
      { beginSend: sinon.stub().resolves({ accept: sinon.stub(), release: sinon.stub().resolves() }) } as never,
      { setContext: sinon.stub(), warn: sinon.stub() } as never
    );

    await sender.send({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      subscriberId: 'alice',
      address: 'alice@example.com',
      token: 'tok123',
      expiresAt: '2026-10-02T12:00:00.000Z',
      outbound: {
        senderIntegration: {} as never,
        from: 'relay@agentinbox.md',
        senderName: 'Acme Ops',
        emailIntegration: {} as never,
      },
    });

    const mail = handlerSend.firstCall.args[0];

    expect(mail.html).to.include('https://agentinbox.md/verify/tok123');
    expect(mail.html).to.not.include('region=');
    expect(mail.text).to.include('Verify this email: https://agentinbox.md/verify/tok123');
    expect(mail.text).to.not.include('region=');
  });
});
