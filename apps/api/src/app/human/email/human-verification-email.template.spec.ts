import { expect } from 'chai';
import { maskEmail } from '../services/mask-email';
import { buildHumanVerificationEmail } from './human-verification-email.template';

describe('maskEmail', () => {
  it('masks the local part', () => {
    expect(maskEmail('alice@example.com')).to.equal('a***@example.com');
  });

  it('returns *** for malformed input', () => {
    expect(maskEmail('not-an-email')).to.equal('***');
  });
});

describe('buildHumanVerificationEmail', () => {
  const base = { verifyUrl: 'https://gethuman.md/verify/tok123', expiresAt: '2026-10-02T12:00:00.000Z' };

  it('names the agent and, separately, the operator who owns it', () => {
    const content = buildHumanVerificationEmail({
      ...base,
      sender: { agentName: 'Acme Ops', operatorName: 'Nikita <Grossman>' },
      inviteeName: 'Alice <script>',
    });

    expect(content.subject).to.equal('Nikita <Grossman> wants to reach you via agent Acme Ops');
    expect(content.html).to.include('Nikita &lt;Grossman&gt;</strong> wants to reach you via agent');
    expect(content.html).to.include('Acme Ops</strong>. Confirm this address belongs to you:');
    expect(content.html).to.include('Verify this email');
    expect(content.html).to.include('https://gethuman.md/verify/tok123');
    expect(content.html).to.include('Alice &lt;script&gt;');
    expect(content.text.startsWith('Hi Alice <script>')).to.equal(true);
    expect(content.text).to.not.include('&lt;');
    expect(content.html).to.include('#ff5c30');
    expect(content.html.toLowerCase()).to.not.include('powered by novu');
    expect(content.text).to.include('Nikita <Grossman> wants to reach you via agent Acme Ops.');
    expect(content.text).to.include('https://gethuman.md/verify/tok123');
  });

  it('leaves the agent out when the relay was never renamed', () => {
    const content = buildHumanVerificationEmail({ ...base, sender: { operatorName: 'Nikita Grossman' } });

    expect(content.subject).to.equal('Nikita Grossman wants to reach you');
    expect(content.html).to.include('Nikita Grossman</strong> wants to reach you.');
    expect(content.html).to.not.include('via agent');
    expect(content.html).to.not.include('>Human<');
    expect(content.text).to.not.match(/\b[Hh]uman\b/);
  });

  it('says Someone when the operator never set a name', () => {
    const content = buildHumanVerificationEmail({ ...base, sender: { agentName: 'Acme Ops' } });

    expect(content.subject).to.equal('Someone wants to reach you via agent Acme Ops');
    expect(content.text).to.include('Someone wants to reach you via agent Acme Ops.');
  });

  it('asks the operator to verify their address without presenting it as an invitation', () => {
    const content = buildHumanVerificationEmail({
      ...base,
      sender: { agentName: "Nikita's Agent", operatorName: 'Nikita' },
      inviteeName: 'Nikita',
      isOperatorVerification: true,
    });

    expect(content.subject).to.equal('Verify your email for Agent Inbox');
    expect(content.html).to.include('agent inbox');
    expect(content.html).to.include('Confirm this address so your agent can reach you through Agent Inbox:');
    expect(content.text).to.include('Confirm this address so your agent can reach you through Agent Inbox.');
    expect(content.html).to.not.include('wants to reach you');
    expect(content.text).to.not.include('wants to reach you');
  });

  it('adds the claim section only when a claim link is given', () => {
    const claimUrl = 'https://gethuman.md/claim?token=a&region=eu';
    const withClaim = buildHumanVerificationEmail({ ...base, sender: {}, claimUrl });
    const without = buildHumanVerificationEmail({ ...base, sender: {} });

    expect(withClaim.html).to.include('Verify this email first');
    expect(withClaim.text).to.include('Verify this email first');
    expect(withClaim.html).to.include('Claim this setup');
    expect(withClaim.html).to.include('https://gethuman.md/claim?token=a&amp;region=eu');
    expect(withClaim.text).to.include(`Claim this setup: ${claimUrl}`);
    expect(without.html).to.not.include('Claim this setup');
    expect(without.text).to.not.include('Claim this setup');
  });
});
