import { expect } from 'chai';
import { alignedEmailChecks, domainsAlign } from './email-sender-alignment';

describe('email sender alignment', () => {
  describe('domainsAlign', () => {
    [
      ['proton.me', 'proton.me', 'the same domain'],
      ['Outlook.COM.', 'outlook.com', 'the same domain in another case, with a trailing dot'],
      ['novu.co', 'dashboard.novu.co', "the From domain's parent (a company signing for a subdomain)"],
      ['em123.novu.co', 'novu.co', "a subdomain of the From domain (an email service's bounce domain)"],
      ['xn--bcher-kva.de', 'bücher.de', 'a Unicode domain and its xn-- form'],
    ].forEach(([authenticated, from, label]) => {
      it(`should align ${label}`, () => {
        expect(domainsAlign(authenticated, from)).to.equal(true);
      });
    });

    [
      ['evil.example', 'gmail.com', 'an unrelated domain'],
      ['notgmail.com', 'gmail.com', 'a domain that only ends with the same letters'],
      ['com', 'gmail.com', 'a bare top-level domain'],
      ['em123.novu.co', 'dashboard.novu.co', 'sibling subdomains'],
      ['', 'gmail.com', 'an empty domain'],
      ['2.3.4', '1.2.3.4', 'IP addresses'],
      ['evil.com\u0000.gmail.com', 'gmail.com', 'a domain with a control character'],
      // A URL parser reads each of these as gmail.com, but DNS looks them up under attacker.net.
      ['gmail.com/.attacker.net', 'gmail.com', 'a domain hidden behind a slash'],
      ['gmail.com?.attacker.net', 'gmail.com', 'a domain hidden behind a question mark'],
      ['gmail.com#.attacker.net', 'gmail.com', 'a domain hidden behind a hash'],
      ['gmail.com\\.attacker.net', 'gmail.com', 'a domain hidden behind a backslash'],
      ['gmail.com', 'gmail.com/.attacker.net', 'a From domain hidden behind a slash'],
    ].forEach(([authenticated, from, label]) => {
      it(`should not align ${label}`, () => {
        expect(domainsAlign(authenticated, from)).to.equal(false);
      });
    });
  });

  describe('alignedEmailChecks', () => {
    it('should report a DKIM signature from the sender domain', () => {
      expect(
        alignedEmailChecks({
          senderAddress: 'ada@proton.me',
          dkimDomains: ['proton.me'],
          spfDomain: 'proton.me',
          spfPassed: true,
        })
      ).to.deep.equal({ dkim: true, spf: true });
    });

    it("should not count checks that passed for the attacker's own domain", () => {
      // DKIM and SPF both pass for evil.example; the From line says gmail.com.
      expect(
        alignedEmailChecks({
          senderAddress: 'victim@gmail.com',
          dkimDomains: ['evil.example'],
          spfDomain: 'evil.example',
          spfPassed: true,
        })
      ).to.deep.equal({ dkim: false, spf: false });
    });

    it('should not count checks that passed for a domain hidden behind a URL separator', () => {
      // The attacker owns attacker.net: DKIM finds the key at s._domainkey.gmail.com/.attacker.net,
      // and SPF looks up gmail.com/.attacker.net, both under attacker.net.
      expect(
        alignedEmailChecks({
          senderAddress: 'victim@gmail.com',
          dkimDomains: ['gmail.com/.attacker.net'],
          spfDomain: 'gmail.com/.attacker.net',
          spfPassed: true,
        })
      ).to.deep.equal({ dkim: false, spf: false });
    });

    it('should find the sender domain among several DKIM signatures', () => {
      expect(
        alignedEmailChecks({
          senderAddress: 'no-reply@novu.co',
          dkimDomains: ['sendgrid.info', 'novu.co'],
          spfDomain: 'sendgrid.net',
          spfPassed: true,
        })
      ).to.deep.equal({ dkim: true, spf: false });
    });

    it('should not count an aligned SPF domain whose check failed', () => {
      expect(
        alignedEmailChecks({
          senderAddress: 'ada@example.com',
          dkimDomains: [],
          spfDomain: 'example.com',
          spfPassed: false,
        })
      ).to.deep.equal({ dkim: false, spf: false });
    });

    it('should use the last @ of the sender address', () => {
      expect(
        alignedEmailChecks({
          senderAddress: '"evil.example@"@gmail.com',
          dkimDomains: ['evil.example'],
          spfDomain: null,
          spfPassed: true,
        })
      ).to.deep.equal({ dkim: false, spf: false });
    });

    it('should align nothing for a sender address without a domain', () => {
      expect(
        alignedEmailChecks({
          senderAddress: 'postmaster',
          dkimDomains: ['postmaster'],
          spfDomain: null,
          spfPassed: true,
        })
      ).to.deep.equal({ dkim: false, spf: false });
    });

    it('should ignore values that are not strings', () => {
      expect(
        alignedEmailChecks({
          senderAddress: 'ada@example.com',
          dkimDomains: [null, 42, { domain: 'example.com' }],
          spfDomain: ['example.com'],
          spfPassed: true,
        })
      ).to.deep.equal({ dkim: false, spf: false });
    });
  });
});
