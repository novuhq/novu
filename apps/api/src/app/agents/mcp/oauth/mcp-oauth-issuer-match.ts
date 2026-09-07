import { getDomain } from 'tldts';

/**
 * RFC 8414 §3.3 issuer comparison with narrow relaxations for real-world MCP gateways.
 */

export type IssuerMatchOpts = {
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  registrationEndpoint?: string;
};

type IssuerUrlPair = { requested: URL; advertised: URL };

type IssuerRelaxationContext = IssuerUrlPair & { endpoints: string[] };

type IssuerRelaxationCheck = (ctx: IssuerRelaxationContext) => boolean;

/**
 * Strict-by-default issuer comparison. See inline relaxations in `ISSUER_RELAXATIONS`.
 */
export function isAcceptableIssuerMatch(requested: string, advertised: string, opts?: IssuerMatchOpts): boolean {
  if (requested === advertised) {
    return true;
  }

  const requestedRoot = normalizeRootIssuerIdentifier(requested);
  const advertisedRoot = normalizeRootIssuerIdentifier(advertised);
  if (requestedRoot && advertisedRoot && requestedRoot === advertisedRoot) {
    return true;
  }

  const urls = parseIssuerUrlPair(requested, advertised);
  if (!urls) {
    return false;
  }

  const advertisedPath = urls.advertised.pathname.replace(/\/+$/, '');
  const requestedPath = urls.requested.pathname.replace(/\/+$/, '');

  if (urls.requested.origin === urls.advertised.origin && advertisedPath === '' && requestedPath !== '') {
    return true;
  }

  const endpoints = collectOAuthEndpointUrls(opts);
  if (!endpoints) {
    return false;
  }

  const ctx: IssuerRelaxationContext = { ...urls, endpoints };

  return ISSUER_RELAXATIONS.some((check) => check(ctx));
}

/** Root issuers that differ only by a trailing slash (e.g. Monte Carlo PRM). */
function normalizeRootIssuerIdentifier(issuer: string): string | null {
  try {
    const parsed = new URL(issuer);
    const path = parsed.pathname.replace(/\/+$/, '');

    if (path !== '') {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

function parseIssuerUrlPair(requested: string, advertised: string): IssuerUrlPair | null {
  try {
    return { requested: new URL(requested), advertised: new URL(advertised) };
  } catch {
    return null;
  }
}

function collectOAuthEndpointUrls(opts?: IssuerMatchOpts): string[] | null {
  if (!opts?.authorizationEndpoint || !opts.tokenEndpoint) {
    return null;
  }

  const urls = [opts.authorizationEndpoint, opts.tokenEndpoint];
  if (opts.registrationEndpoint) {
    urls.push(opts.registrationEndpoint);
  }

  return urls;
}

/** Public-suffix-aware registrable domain via `tldts` (e.g. `example.co.uk`, not `co.uk`). */
function getRegistrableDomain(hostname: string): string {
  return getDomain(hostname) ?? hostname;
}

function hostnameBelongsToDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname;

    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

function endpointsBelongToDomain(endpoints: string[], domain: string): boolean {
  return endpoints.every((endpoint) => hostnameBelongsToDomain(endpoint, domain));
}

/** Clerk-style: PRM product host, delegated issuer subdomain, endpoints on product host. */
const isDelegatedProductIssuer: IssuerRelaxationCheck = ({ requested, advertised, endpoints }) => {
  if (requested.hostname === advertised.hostname) {
    return false;
  }

  if (advertised.hostname !== requested.hostname && !advertised.hostname.endsWith(`.${requested.hostname}`)) {
    return false;
  }

  return endpointsBelongToDomain(endpoints, requested.hostname);
};

/** Vercel-style: PRM product subdomain, parent-domain issuer, endpoints on parent host. */
const isParentDomainIssuer: IssuerRelaxationCheck = ({ requested, advertised, endpoints }) => {
  if (requested.hostname === advertised.hostname) {
    return false;
  }

  if (!requested.hostname.endsWith(`.${advertised.hostname}`)) {
    return false;
  }

  const advertisedPath = advertised.pathname.replace(/\/+$/, '');
  if (advertisedPath !== '') {
    return false;
  }

  return endpointsBelongToDomain(endpoints, advertised.hostname);
};

/** New Relic-style: MCP product host + sibling auth subdomain on same registrable domain. */
const isSiblingRegistrableDomainIssuer: IssuerRelaxationCheck = ({ requested, advertised, endpoints }) => {
  if (requested.origin === advertised.origin) {
    return false;
  }

  const requestedDomain = getRegistrableDomain(requested.hostname);
  const advertisedDomain = getRegistrableDomain(advertised.hostname);

  if (requestedDomain !== advertisedDomain) {
    return false;
  }

  return endpointsBelongToDomain(endpoints, requestedDomain);
};

/** PlanetScale-style: path-based MCP resource URL, canonical issuer on sibling origin. */
const isWellKnownGatewayIssuer: IssuerRelaxationCheck = ({ requested, advertised, endpoints }) => {
  const requestedPath = requested.pathname.replace(/\/+$/, '');
  if (requestedPath === '') {
    return false;
  }

  if (requested.origin === advertised.origin) {
    return false;
  }

  const advertisedDomain = getRegistrableDomain(advertised.hostname);

  return endpointsBelongToDomain(endpoints, advertisedDomain);
};

const ISSUER_RELAXATIONS: readonly IssuerRelaxationCheck[] = [
  isDelegatedProductIssuer,
  isParentDomainIssuer,
  isSiblingRegistrableDomainIssuer,
  isWellKnownGatewayIssuer,
];
