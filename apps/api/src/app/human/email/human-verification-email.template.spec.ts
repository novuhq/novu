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
  const base = {
    verifyUrl: 'https://agentinbox.md/verify/7Q4Kabcdef',
    address: 'maya@acme.co',
    agentAddress: 'atlas@agentinbox.md',
  };
  const sender = {
    agentName: 'Atlas',
    operatorName: 'Dima Grossman',
    pictureUrl: 'https://agentinbox.md/brand/agent-avatar.png',
  };
  const pictureOnly = { pictureUrl: sender.pictureUrl };

  describe('invite', () => {
    it('says who wants to reach them and who runs the agent', () => {
      const content = buildHumanVerificationEmail({ ...base, sender, inviteeName: 'Maya' });

      expect(content.subject).to.equal('Atlas wants to reach you');
      expect(content.html).to.include('Atlas is an AI agent working for Dima Grossman.');
      expect(content.html).to.include('AI agent · run by Dima Grossman');
      expect(content.html).to.include('atlas@agentinbox.md');
      expect(content.html).to.include('Hi Maya,');
      expect(content.html).to.include('>Confirm email</a>');
      expect(content.html).to.include('Sent on behalf of Dima Grossman. Atlas did the typing.');
      expect(content.text).to.include('Confirm email: https://agentinbox.md/verify/7Q4Kabcdef');
    });

    it('shows the start of the link and hides the whole one behind it', () => {
      const { html } = buildHumanVerificationEmail({ ...base, sender });

      expect(html).to.include('Button being shy? Paste this link:');
      expect(html).to.include('>agentinbox.md/verify/7Q4K…</a>');
      expect(html).to.include('href="https://agentinbox.md/verify/7Q4Kabcdef"');
    });

    it('promises only what the link does', () => {
      const content = buildHumanVerificationEmail({ ...base, sender });

      expect(content.html).to.include('The link works for 24 hours.');
      expect(content.html).to.not.include('can’t email you');
      expect(content.text).to.not.include('can’t email you');
    });

    it('escapes what people typed, in the HTML only', () => {
      const content = buildHumanVerificationEmail({
        ...base,
        sender: { ...sender, operatorName: 'Nikita <Grossman>' },
        inviteeName: 'Alice <script>',
      });

      expect(content.html).to.include('Nikita &lt;Grossman&gt;');
      expect(content.html).to.include('Alice &lt;script&gt;');
      expect(content.text.startsWith('Hi Alice <script>')).to.equal(true);
      expect(content.text).to.not.include('&lt;');
    });

    it('leans on the operator while the agent still has no name', () => {
      const content = buildHumanVerificationEmail({
        ...base,
        sender: { ...pictureOnly, operatorName: 'Dima Grossman' },
      });

      expect(content.subject).to.equal('Dima Grossman wants to reach you');
      expect(content.html).to.include('This is an AI agent working for Dima Grossman.');
      expect(content.html).to.include('Sent on behalf of Dima Grossman. An AI agent did the typing.');
      expect(content.text).to.not.match(/\b[Hh]uman\b/);
    });

    it('says Someone with no names at all', () => {
      const content = buildHumanVerificationEmail({ ...base, sender: pictureOnly });

      expect(content.subject).to.equal('Someone wants to reach you');
      expect(content.html).to.include('Hi,');
    });
  });

  describe('confirm', () => {
    const operator = { ...base, sender, inviteeName: 'Dima', address: 'dima@acme.co', isOperatorVerification: true };

    it('asks the operator to confirm, without presenting it as an invitation', () => {
      const content = buildHumanVerificationEmail(operator);

      expect(content.subject).to.equal('Confirm your email');
      expect(content.html).to.include('dima@acme.co');
      expect(content.html).to.include('so Atlas knows where to find you when it needs a human.');
      expect(content.html).to.include('The link works for 24 hours. Didn’t sign up? Ignore this. Atlas will cope.');
      expect(content.html).to.not.include('wants to reach you');
      expect(content.text).to.not.include('wants to reach you');
      expect(content.html).to.include('Button being shy?');
    });

    it('has no Novu in it', () => {
      expect(buildHumanVerificationEmail(operator).html.toLowerCase()).to.not.include('novu');
    });

    it('keeps the agent generic while it has no name', () => {
      const { html } = buildHumanVerificationEmail({ ...operator, sender: pictureOnly });

      expect(html).to.include('so your agent knows where to find you');
      expect(html).to.include('Your agent will cope.');
    });

    it('adds the claim box only when a claim link is given, in place of the paste line', () => {
      const claimUrl = 'https://agentinbox.md/claim?token=a';
      const withClaim = buildHumanVerificationEmail({ ...operator, claimUrl });
      const without = buildHumanVerificationEmail(operator);

      expect(withClaim.html).to.include('DEMO SETUP');
      expect(withClaim.html).to.include('Make this setup yours');
      expect(withClaim.html).to.include('Remove the 5-message demo limit (Atlas has a lot to say)');
      expect(withClaim.html).to.include('Confirm your email first. Paperwork, we know.');
      expect(withClaim.html).to.include(claimUrl);
      expect(withClaim.html).to.not.include('Button being shy?');
      expect(withClaim.text).to.include(`Claim setup: ${claimUrl}`);
      expect(without.html).to.not.include('Make this setup yours');
      expect(without.text).to.not.include('Claim setup');
    });
  });
});
