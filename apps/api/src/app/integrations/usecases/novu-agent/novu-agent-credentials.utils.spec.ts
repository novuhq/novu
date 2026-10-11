import { EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { ensureNovuAgentManagedCredentials } from './novu-agent-credentials.utils';

describe('ensureNovuAgentManagedCredentials', () => {
  it('strips a client routing key and secret when creating an agent inbox', () => {
    const result = ensureNovuAgentManagedCredentials({
      providerId: EmailProviderIdEnum.AgentEmailInbox,
      nextCredentials: {
        inboxRoutingKey: 'stolen01',
        secretKey: 'client-secret',
        senderName: 'Ops',
      },
      stripClientSecret: true,
    });

    expect(result.inboxRoutingKey).to.equal(undefined);
    expect(result.secretKey).to.equal(undefined);
    expect(result.senderName).to.equal('Ops');
  });

  it('keeps the stored routing key and secret on update', () => {
    const result = ensureNovuAgentManagedCredentials({
      providerId: EmailProviderIdEnum.NovuAgent,
      nextCredentials: {
        inboxRoutingKey: 'stolen01',
        secretKey: 'client-secret',
        senderName: 'Ops',
      },
      existingCredentials: {
        inboxRoutingKey: 'stored01',
        secretKey: 'stored-secret',
      },
    });

    expect(result.inboxRoutingKey).to.equal('stored01');
    expect(result.secretKey).to.equal('stored-secret');
    expect(result.senderName).to.equal('Ops');
  });

  it('leaves other providers unchanged', () => {
    const next = { inboxRoutingKey: 'kept', secretKey: 'kept-secret' };

    expect(
      ensureNovuAgentManagedCredentials({
        providerId: EmailProviderIdEnum.SendGrid,
        nextCredentials: next,
        stripClientSecret: true,
      })
    ).to.equal(next);
  });
});
