import { createVerify, generateKeyPairSync } from 'node:crypto';
import type { DomainEntity } from '@novu/dal';
import { expect } from 'chai';
import {
  areProviderSettingsUrlsAllowed,
  buildDomainConnectApplyUrl,
  buildDomainConnectSettingsUrl,
  getDomainConnectDiscoveryCandidates,
  isSupportedDomainConnectHost,
  normalizeDomainConnectEndpoint,
  normalizeDomainConnectHost,
} from './domain-connect';

describe('Domain Connect utils', () => {
  const previousEnv = { ...process.env };
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const domain = {
    _id: 'domain-id',
    name: 'example.com',
    _environmentId: 'environment-id',
    _organizationId: 'organization-id',
  } as DomainEntity;

  beforeEach(() => {
    process.env.DOMAIN_CONNECT_PRIVATE_KEY = privateKey;
    process.env.DASHBOARD_URL = 'https://dashboard.novu.co';
    process.env.MAIL_SERVER_DOMAIN = 'mail.novu.co';
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  it('normalizes and allowlists supported provider hosts', () => {
    expect(normalizeDomainConnectHost('https://domainconnect.cloudflare.com/v2/example.com/settings')).to.equal(
      'domainconnect.cloudflare.com'
    );
    expect(isSupportedDomainConnectHost('domainconnect.cloudflare.com')).to.equal(true);
    expect(isSupportedDomainConnectHost('api.cloudflare.com')).to.equal(true);
    expect(isSupportedDomainConnectHost('domainconnect.vercel.com')).to.equal(true);
    expect(isSupportedDomainConnectHost('metadata.google.internal')).to.equal(false);
  });

  it('preserves provider endpoint paths when building the settings URL', () => {
    expect(normalizeDomainConnectEndpoint('api.cloudflare.com/client/v4/domainconnect')).to.equal(
      'api.cloudflare.com/client/v4/domainconnect'
    );
    expect(buildDomainConnectSettingsUrl('grossman.io', 'api.cloudflare.com/client/v4/domainconnect')).to.equal(
      'https://api.cloudflare.com/client/v4/domainconnect/v2/grossman.io/settings'
    );
    expect(buildDomainConnectSettingsUrl('grossman.io', 'api.cloudflare.com')).to.equal(
      'https://api.cloudflare.com/client/v4/domainconnect/v2/grossman.io/settings'
    );
  });

  it('returns likely root-domain discovery candidates before the submitted subdomain', () => {
    expect(getDomainConnectDiscoveryCandidates('inbound.grossman.io')).to.deep.equal([
      'grossman.io',
      'inbound.grossman.io',
    ]);
    expect(getDomainConnectDiscoveryCandidates('inbound.example.co.uk')).to.deep.equal([
      'example.co.uk',
      'inbound.example.co.uk',
    ]);
  });

  it('rejects provider settings URLs outside the discovered provider', () => {
    expect(
      areProviderSettingsUrlsAllowed(
        {
          urlSyncUX: 'https://vercel.com/domain-connect',
          urlAPI: 'https://vercel.com/api/domain-connect',
        },
        'domainconnect.vercel.com'
      )
    ).to.equal(true);
    expect(
      areProviderSettingsUrlsAllowed(
        {
          urlSyncUX: 'https://evil.example.com/domain-connect',
          urlAPI: 'https://vercel.com/api/domain-connect',
        },
        'domainconnect.vercel.com'
      )
    ).to.equal(false);
  });

  it('places the Cloudflare signature as the final query parameter', () => {
    const result = buildDomainConnectApplyUrl({
      domain,
      connectDomainName: 'example.com',
      discoveredHost: 'domainconnect.cloudflare.com',
      settings: {
        urlSyncUX: 'https://dash.cloudflare.com/domain-connect',
        urlAPI: 'https://api.cloudflare.com/domain-connect',
      },
    });
    const url = new URL(result.applyUrl);
    const keys = Array.from(url.searchParams.keys());

    expect(keys[keys.length - 1]).to.equal('sig');
    expect(url.searchParams.get('key')).to.equal('_dck1');
    expect(url.searchParams.get('mailServerDomain')).to.equal('mail.novu.co');
    expectSignature(url);
  });

  it('places the Vercel key after the signature', () => {
    const result = buildDomainConnectApplyUrl({
      domain,
      connectDomainName: 'example.com',
      discoveredHost: 'domainconnect.vercel.com',
      settings: {
        urlSyncUX: 'https://vercel.com/domain-connect',
        urlAPI: 'https://vercel.com/api/domain-connect',
      },
    });
    const url = new URL(result.applyUrl);
    const keys = Array.from(url.searchParams.keys());

    expect(keys[keys.length - 2]).to.equal('sig');
    expect(keys[keys.length - 1]).to.equal('key');
    expectSignature(url);
  });

  it('rejects redirect URIs outside the configured dashboard origin', () => {
    expect(() =>
      buildDomainConnectApplyUrl({
        domain,
        connectDomainName: 'example.com',
        discoveredHost: 'domainconnect.vercel.com',
        redirectUri: 'https://evil.example.com/callback',
        settings: {
          urlSyncUX: 'https://vercel.com/domain-connect',
          urlAPI: 'https://vercel.com/api/domain-connect',
        },
      })
    ).to.throw('Domain Connect redirect URI origin is not allowed.');
  });

  it('uses the root domain and host when building an apply URL for a subdomain', () => {
    const result = buildDomainConnectApplyUrl({
      domain: { ...domain, name: 'inbound.example.com' },
      connectDomainName: 'example.com',
      discoveredHost: 'domainconnect.vercel.com',
      settings: {
        urlSyncUX: 'https://vercel.com/domain-connect',
        urlAPI: 'https://vercel.com/api/domain-connect',
      },
    });
    const url = new URL(result.applyUrl);

    expect(url.searchParams.get('domain')).to.equal('example.com');
    expect(url.searchParams.get('host')).to.equal('inbound');
  });

  function expectSignature(url: URL) {
    const signature = url.searchParams.get('sig');

    if (!signature) {
      throw new Error('Expected signed Domain Connect URL.');
    }

    const signableParams = new URLSearchParams(url.search);
    signableParams.delete('sig');
    signableParams.delete('key');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(signableParams.toString());
    verifier.end();

    expect(verifier.verify(publicKey, signature, 'base64')).to.equal(true);
  }
});
