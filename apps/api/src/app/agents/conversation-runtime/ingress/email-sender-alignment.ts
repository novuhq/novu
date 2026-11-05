import { domainToASCII } from 'node:url';

/**
 * Whether a domain that passed DKIM or SPF stands for the From address's
 * domain, as in DMARC's relaxed alignment: the same domain, or one inside the
 * other, because mail services sign as, and bounce through, parent domains and
 * subdomains (`novu.co` signs for `dashboard.novu.co`, SendGrid bounces through
 * `em123.novu.co` for `novu.co`).
 *
 * Without a public suffix list this is stricter than DMARC in two ways: sibling
 * subdomains (`em123.novu.co` and `dashboard.novu.co`) don't align, and neither
 * does a bare top-level domain such as `com`.
 */
export function domainsAlign(authenticatedDomain: string, fromDomain: string): boolean {
  const authenticated = normalizeDomain(authenticatedDomain);
  const from = normalizeDomain(fromDomain);

  if (!authenticated || !from) {
    return false;
  }

  if (authenticated === from) {
    return true;
  }

  const [parent, child] = authenticated.length < from.length ? [authenticated, from] : [from, authenticated];

  return parent.includes('.') && child.endsWith(`.${parent}`);
}

/**
 * Which of an email's checks passed for the sender's own domain.
 *
 * @param senderAddress the address the sender is identified by (from `From`)
 * @param dkimDomains the d= domains whose DKIM signatures verified
 * @param spfDomain the domain SPF checked (the MAIL FROM domain)
 * @param spfPassed the SPF verdict, since `spfDomain` is set either way
 */
export function alignedEmailChecks(params: {
  senderAddress: string;
  dkimDomains: unknown[];
  spfDomain: unknown;
  spfPassed: boolean;
}): { dkim: boolean; spf: boolean } {
  // A domain can't contain '@', so the domain is what follows the last one.
  const at = params.senderAddress.lastIndexOf('@');
  const fromDomain = at === -1 ? '' : params.senderAddress.slice(at + 1);

  if (!fromDomain) {
    return { dkim: false, spf: false };
  }

  return {
    dkim: params.dkimDomains.some((domain) => typeof domain === 'string' && domainsAlign(domain, fromDomain)),
    spf: params.spfPassed && typeof params.spfDomain === 'string' && domainsAlign(params.spfDomain, fromDomain),
  };
}

/*
 * Letters of any script, digits, hyphens and dots. `domainToASCII` parses its
 * input as a URL host and drops whatever follows a separator, so it turns
 * `gmail.com/.attacker.net` into `gmail.com`, while DKIM and SPF look that
 * name up under attacker.net.
 */
const DOMAIN_CHARACTERS = /^[\p{L}\p{M}\p{N}.-]+$/u;

/**
 * Lowercase ASCII (`xn--`) form, which is what DKIM's d= always uses, or ''
 * for anything that isn't a host name: other characters than the ones above,
 * input `domainToASCII` rejects, or an IP address, which has no letter in its
 * last label.
 */
function normalizeDomain(domain: string): string {
  const name = domain.trim().replace(/\.$/, '');
  if (!DOMAIN_CHARACTERS.test(name)) {
    return '';
  }

  const ascii = domainToASCII(name);
  const lastLabel = ascii.slice(ascii.lastIndexOf('.') + 1);

  return /[a-z]/.test(lastLabel) ? ascii : '';
}
