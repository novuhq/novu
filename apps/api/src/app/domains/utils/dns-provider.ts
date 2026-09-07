import { promises as dnsPromises } from 'node:dns';

const NS_PROVIDER_PATTERNS: Array<{ pattern: string; provider: string }> = [
  { pattern: 'cloudflare.com', provider: 'Cloudflare' },
  { pattern: 'awsdns', provider: 'Amazon Route 53' },
  { pattern: 'azure-dns.com', provider: 'Azure DNS' },
  { pattern: 'azure-dns.net', provider: 'Azure DNS' },
  { pattern: 'azure-dns.org', provider: 'Azure DNS' },
  { pattern: 'azure-dns.info', provider: 'Azure DNS' },
  { pattern: 'googledomains.com', provider: 'Google Domains' },
  { pattern: 'google.com', provider: 'Google Domains' },
  { pattern: 'domaincontrol.com', provider: 'GoDaddy' },
  { pattern: 'registrar-servers.com', provider: 'Namecheap' },
  { pattern: 'dnsmadeeasy.com', provider: 'DNS Made Easy' },
  { pattern: 'vercel-dns.com', provider: 'Vercel' },
  { pattern: 'nsone.net', provider: 'NS1' },
  { pattern: 'dnsimple.com', provider: 'DNSimple' },
  { pattern: 'hover.com', provider: 'Hover' },
  { pattern: 'name.com', provider: 'Name.com' },
  { pattern: 'squarespace.com', provider: 'Squarespace' },
  { pattern: 'wixdns.net', provider: 'Wix' },
  { pattern: 'shopify.com', provider: 'Shopify' },
];

function matchProviderFromNs(nsRecords: string[]): string | null {
  for (const ns of nsRecords) {
    const lower = ns.toLowerCase();

    for (const { pattern, provider } of NS_PROVIDER_PATTERNS) {
      if (lower.includes(pattern)) {
        return provider;
      }
    }
  }

  return null;
}

export async function detectDnsProvider(domainName: string): Promise<string | null> {
  const labels = domainName.split('.');

  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    try {
      const nsRecords = await dnsPromises.resolveNs(candidate);

      return matchProviderFromNs(nsRecords);
    } catch {
      // ENODATA / ENOTFOUND — no NS records at this level, try parent
    }
  }

  return null;
}
