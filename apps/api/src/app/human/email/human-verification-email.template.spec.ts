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
    expect(content.html).to.include('#ff5c30');
    expect(content.html.toLowerCase()).to.not.include('powered by novu');
    expect(content.text).to.include('Nikita <Grossman> wants to reach you via agent Acme Ops.');
    expect(content.text).to.include('https://gethuman.md/verify/tok123');
  });

  it('uses the placeholder agent name when the relay was never renamed', () => {
    const content = buildHumanVerificationEmail({ ...base, sender: { operatorName: 'Nikita Grossman' } });

    expect(content.subject).to.equal('Nikita Grossman wants to reach you via agent Human');
    expect(content.html).to.include('Nikita Grossman</strong> wants to reach you via agent');
    expect(content.html).to.include('Human</strong>. Confirm this address belongs to you:');
  });

  it('says Someone when the operator never set a name', () => {
    const content = buildHumanVerificationEmail({ ...base, sender: { agentName: 'Acme Ops' } });

    expect(content.subject).to.equal('Someone wants to reach you via agent Acme Ops');
    expect(content.text).to.include('Someone wants to reach you via agent Acme Ops.');
  });
});
