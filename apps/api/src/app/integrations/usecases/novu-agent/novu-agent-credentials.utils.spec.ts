import { EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import {
  mergeAgentInboxCredentialsForUpdate,
  sanitizeAgentInboxCredentialsForCreate,
} from './novu-agent-credentials.utils';

describe('sanitizeAgentInboxCredentialsForCreate', () => {
  it('strips a client routing key and secret when creating an agent inbox', () => {
    const result = sanitizeAgentInboxCredentialsForCreate(EmailProviderIdEnum.AgentEmailInbox, {
      inboxRoutingKey: 'stolen01',
      secretKey: 'client-secret',
      sharedInboxDisabled: true,
      senderName: 'Ops',
    });

    expect(result.inboxRoutingKey).to.equal(undefined);
    expect(result.secretKey).to.equal(undefined);
    expect(result.sharedInboxDisabled).to.equal(undefined);
    expect(result.senderName).to.equal('Ops');
  });

  it('keeps a valid slug prefix and drops an invalid one', () => {
    expect(
      sanitizeAgentInboxCredentialsForCreate(EmailProviderIdEnum.NovuAgent, { emailSlugPrefix: 'human-relay' })
        .emailSlugPrefix
    ).to.equal('human-relay');

    expect(
      sanitizeAgentInboxCredentialsForCreate(EmailProviderIdEnum.NovuAgent, { emailSlugPrefix: 'Not A Slug!' })
        .emailSlugPrefix
    ).to.equal(undefined);
  });

  it('leaves other providers unchanged', () => {
    const next = { inboxRoutingKey: 'kept', secretKey: 'kept-secret' };

    expect(sanitizeAgentInboxCredentialsForCreate(EmailProviderIdEnum.SendGrid, next)).to.equal(next);
  });
});

describe('mergeAgentInboxCredentialsForUpdate', () => {
  it('keeps the stored routing key and secret on update', () => {
    const result = mergeAgentInboxCredentialsForUpdate(
      EmailProviderIdEnum.NovuAgent,
      { inboxRoutingKey: 'stolen01', secretKey: 'client-secret', senderName: 'Ops' },
      { inboxRoutingKey: 'stored01', secretKey: 'stored-secret' }
    );

    expect(result.inboxRoutingKey).to.equal('stored01');
    expect(result.secretKey).to.equal('stored-secret');
    expect(result.senderName).to.equal('Ops');
  });

  it('keeps the stored slug when an update omits it', () => {
    const result = mergeAgentInboxCredentialsForUpdate(
      EmailProviderIdEnum.AgentEmailInbox,
      { senderName: 'Ops' },
      { inboxRoutingKey: 'stored01', emailSlugPrefix: 'human-relay', secretKey: 'stored-secret' }
    );

    expect(result.emailSlugPrefix).to.equal('human-relay');
    expect(result.inboxRoutingKey).to.equal('stored01');
    expect(result.senderName).to.equal('Ops');
  });

  it('replaces the slug when the update sends a valid prefix', () => {
    const result = mergeAgentInboxCredentialsForUpdate(
      EmailProviderIdEnum.NovuAgent,
      { emailSlugPrefix: 'renamed-bot', senderName: 'Ops' },
      { emailSlugPrefix: 'human-relay' }
    );

    expect(result.emailSlugPrefix).to.equal('renamed-bot');
  });

  it('keeps a stored `sharedInboxDisabled: false` rather than dropping it', () => {
    const result = mergeAgentInboxCredentialsForUpdate(
      EmailProviderIdEnum.NovuAgent,
      { sharedInboxDisabled: true },
      { sharedInboxDisabled: false }
    );

    expect(result.sharedInboxDisabled).to.equal(false);
  });

  it('leaves other providers unchanged', () => {
    const next = { inboxRoutingKey: 'kept', secretKey: 'kept-secret' };

    expect(mergeAgentInboxCredentialsForUpdate(EmailProviderIdEnum.SendGrid, next, undefined)).to.equal(next);
  });
});
