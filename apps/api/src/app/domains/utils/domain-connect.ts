import { createSign } from 'node:crypto';
import { DomainEntity } from '@novu/dal';
import { parse } from 'tldts';
import { getMailServerDomain } from './dns-records';

export const DOMAIN_CONNECT_PROVIDER_ID = 'novu.co';
export const DOMAIN_CONNECT_SERVICE_ID = 'inbound-email';
export const DOMAIN_CONNECT_KEY_HOST = '_dck1';

export const SUPPORTED_DOMAIN_CONNECT_HOSTS: Record<string, string> = {
  'api.cloudflare.com': 'Cloudflare',
  'domainconnect.cloudflare.com': 'Cloudflare',
  'domainconnect.vercel.com': 'Vercel',
};

const ALLOWED_PROVIDER_URL_HOSTS: Record<string, string[]> = {
  Cloudflare: ['cloudflare.com'],
  Vercel: ['vercel.com'],
};

export interface DomainConnectProviderSettings {
  providerId?: string;
  providerName?: string;
  providerDisplayName?: string;
  urlSyncUX?: string;
  urlAPI?: string;
}

export interface DomainConnectConfig {
  providerId: string;
  serviceId: string;
  privateKey?: string;
  keyHost: string;
  redirectBaseUrl?: string;
}

export interface BuildApplyUrlParams {
  domain: DomainEntity;
  connectDomainName: string;
  settings: DomainConnectProviderSettings;
  discoveredHost: string;
  redirectUri?: string;
}

export function getDomainConnectConfig(): DomainConnectConfig {
  return {
    providerId: DOMAIN_CONNECT_PROVIDER_ID,
    serviceId: DOMAIN_CONNECT_SERVICE_ID,
    privateKey: process.env.DOMAIN_CONNECT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    keyHost: DOMAIN_CONNECT_KEY_HOST,
    redirectBaseUrl: getDomainConnectRedirectBaseUrl(),
  };
}

export function normalizeDomainConnectHost(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
    .toLowerCase();
}

export function normalizeDomainConnectEndpoint(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

export function isSupportedDomainConnectHost(host: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_DOMAIN_CONNECT_HOSTS, getDomainConnectHostname(host));
}

export function getProviderNameForHost(host: string): string | undefined {
  return SUPPORTED_DOMAIN_CONNECT_HOSTS[getDomainConnectHostname(host)];
}

export function buildDomainConnectSettingsUrl(domainName: string, host: string): string {
  return `${getDomainConnectBaseUrl(host)}/v2/${domainName}/settings`;
}

export function buildTemplateSupportUrl(
  settings: DomainConnectProviderSettings,
  providerId: string,
  serviceId: string
): string | undefined {
  if (!settings.urlAPI) {
    return undefined;
  }

  const baseUrl = settings.urlAPI.replace(/\/+$/, '');

  return `${baseUrl}/v2/domainTemplates/providers/${providerId}/services/${serviceId}`;
}

export function areProviderSettingsUrlsAllowed(
  settings: DomainConnectProviderSettings,
  discoveredHost: string
): boolean {
  const providerName = getProviderNameForHost(discoveredHost);

  if (!providerName || !settings.urlSyncUX) {
    return false;
  }

  if (!isProviderUrlAllowed(settings.urlSyncUX, providerName)) {
    return false;
  }

  if (settings.urlAPI && !isProviderUrlAllowed(settings.urlAPI, providerName)) {
    return false;
  }

  return true;
}

export function buildDomainConnectApplyUrl(params: BuildApplyUrlParams): { applyUrl: string; redirectUri: string } {
  const config = getDomainConnectConfig();
  const mailServerDomain = getMailServerDomain();
  const host = getDomainConnectApplyHost(params.domain.name, params.connectDomainName);

  if (!config.privateKey || !config.keyHost || !config.redirectBaseUrl) {
    throw new Error('Domain Connect signing configuration is incomplete.');
  }

  if (!mailServerDomain) {
    throw new Error('MAIL_SERVER_DOMAIN is not configured.');
  }

  if (!params.settings.urlSyncUX) {
    throw new Error('DNS provider does not support Domain Connect synchronous flow.');
  }

  const redirectUri = buildRedirectUri({
    configuredRedirectBaseUrl: config.redirectBaseUrl,
    requestedRedirectUri: params.redirectUri,
    domain: params.domain,
  });
  const applyBaseUrl = `${params.settings.urlSyncUX.replace(/\/+$/, '')}/v2/domainTemplates/providers/${
    config.providerId
  }/services/${config.serviceId}/apply`;
  const signableParams = new URLSearchParams();
  signableParams.set('domain', params.connectDomainName);
  if (host) {
    signableParams.set('host', host);
  }
  signableParams.set('mailServerDomain', mailServerDomain);
  signableParams.set('redirect_uri', redirectUri);
  signableParams.set('state', buildStateToken(params.domain));

  const signature = signQueryString(signableParams.toString(), config.privateKey);
  const providerName = getProviderNameForHost(params.discoveredHost);

  if (providerName === 'Cloudflare') {
    signableParams.set('key', config.keyHost);
    signableParams.set('sig', signature);

    return {
      applyUrl: `${applyBaseUrl}?${signableParams.toString()}`,
      redirectUri,
    };
  }

  signableParams.set('sig', signature);
  signableParams.set('key', config.keyHost);

  return {
    applyUrl: `${applyBaseUrl}?${signableParams.toString()}`,
    redirectUri,
  };
}

export function hasDomainConnectRuntimeConfig(): boolean {
  const config = getDomainConnectConfig();

  return Boolean(config.privateKey && config.keyHost && config.redirectBaseUrl);
}

export function getDomainConnectDiscoveryCandidates(domainName: string): string[] {
  const labels = domainName.toLowerCase().replace(/\.$/, '').split('.').filter(Boolean);

  const registrableDomain = getRegistrableDomain(domainName);
  if (registrableDomain) {
    const rootLabels = registrableDomain.split('.');
    const rootStartIndex = labels.length - rootLabels.length;

    if (rootStartIndex >= 0) {
      const candidates: string[] = [];
      for (let index = rootStartIndex; index >= 0; index -= 1) {
        candidates.push(labels.slice(index).join('.'));
      }

      return candidates;
    }
  }

  if (labels.length <= 2) {
    return [labels.join('.')];
  }

  const candidates: string[] = [];
  for (let index = labels.length - 2; index >= 0; index -= 1) {
    candidates.push(labels.slice(index).join('.'));
  }

  return candidates;
}

function getRegistrableDomain(domainName: string): string | undefined {
  try {
    return parse(domainName).domain ?? undefined;
  } catch {
    return undefined;
  }
}

function buildRedirectUri({
  configuredRedirectBaseUrl,
  requestedRedirectUri,
  domain,
}: {
  configuredRedirectBaseUrl: string;
  requestedRedirectUri?: string;
  domain: DomainEntity;
}): string {
  const configuredUrl = new URL(applyDomainPlaceholders(configuredRedirectBaseUrl, domain));
  const redirectUrl = new URL(
    requestedRedirectUri ? applyDomainPlaceholders(requestedRedirectUri, domain) : configuredUrl.toString()
  );

  if (redirectUrl.origin !== configuredUrl.origin) {
    throw new Error('Domain Connect redirect URI origin is not allowed.');
  }

  redirectUrl.searchParams.set('domainConnect', 'submitted');
  redirectUrl.searchParams.set('domain', domain.name);

  return redirectUrl.toString();
}

function applyDomainPlaceholders(value: string, domain: DomainEntity): string {
  return value
    .split('{domain}')
    .join(domain.name)
    .split('{domainId}')
    .join(domain._id)
    .split('{environmentId}')
    .join(domain._environmentId as unknown as string)
    .split('{organizationId}')
    .join(domain._organizationId as unknown as string);
}

function buildStateToken(domain: DomainEntity): string {
  const payload = JSON.stringify({
    domainId: domain._id,
    environmentId: domain._environmentId,
    organizationId: domain._organizationId,
    timestamp: Date.now(),
  });

  return Buffer.from(payload).toString('base64url');
}

function signQueryString(queryString: string, privateKey: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(queryString);
  signer.end();

  return signer.sign(privateKey, 'base64');
}

function getDomainConnectApplyHost(domainName: string, connectDomainName: string): string | undefined {
  const normalizedDomainName = domainName.toLowerCase().replace(/\.$/, '');
  const normalizedConnectDomainName = connectDomainName.toLowerCase().replace(/\.$/, '');

  if (normalizedDomainName === normalizedConnectDomainName) {
    return undefined;
  }

  if (!normalizedDomainName.endsWith(`.${normalizedConnectDomainName}`)) {
    return undefined;
  }

  return normalizedDomainName.slice(0, -normalizedConnectDomainName.length - 1);
}

function isProviderUrlAllowed(value: string, providerName: string): boolean {
  try {
    const url = new URL(value);
    const allowedHosts = ALLOWED_PROVIDER_URL_HOSTS[providerName] ?? [];

    if (url.protocol !== 'https:') {
      return false;
    }

    return allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function getDomainConnectBaseUrl(value: string): string {
  const endpoint = normalizeDomainConnectEndpoint(value);

  if (endpoint === 'api.cloudflare.com') {
    return 'https://api.cloudflare.com/client/v4/domainconnect';
  }

  return `https://${endpoint}`;
}

function getDomainConnectHostname(value: string): string {
  return normalizeDomainConnectHost(value);
}

function getDomainConnectRedirectBaseUrl(): string | undefined {
  const dashboardBaseUrl = process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL;

  if (!dashboardBaseUrl) {
    return undefined;
  }

  return `${dashboardBaseUrl.replace(/\/+$/, '')}/domains/{domain}`;
}
