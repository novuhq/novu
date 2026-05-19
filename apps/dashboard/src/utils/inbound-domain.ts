export const DOMAIN_NAME_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function normalizeInboundDomainName(domainName: string): string {
  return domainName.trim().toLowerCase().replace(/\.$/, '');
}

export function isValidInboundDomainName(domainName: string): boolean {
  return DOMAIN_NAME_PATTERN.test(normalizeInboundDomainName(domainName));
}

/**
 * True when the inbound domain is the zone apex (e.g. acme.com), not a subdomain (e.g. inbound.acme.com).
 */
export function isApexInboundDomain(domainName: string): boolean {
  const normalized = normalizeInboundDomainName(domainName);

  if (!isValidInboundDomainName(normalized)) {
    return false;
  }

  const labels = normalized.split('.').filter(Boolean);

  return labels.length <= 2;
}
