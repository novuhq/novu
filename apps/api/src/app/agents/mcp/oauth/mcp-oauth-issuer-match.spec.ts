import { expect } from 'chai';

import { type IssuerMatchOpts, isAcceptableIssuerMatch } from './mcp-oauth-issuer-match';

const CONTEXT7_OPTS: IssuerMatchOpts = {
  authorizationEndpoint: 'https://context7.com/api/oauth/authorize',
  tokenEndpoint: 'https://context7.com/api/oauth/token',
  registrationEndpoint: 'https://context7.com/api/oauth/register',
};

const VERCEL_OPTS: IssuerMatchOpts = {
  authorizationEndpoint: 'https://vercel.com/oauth/authorize',
  tokenEndpoint: 'https://vercel.com/api/login/oauth/token',
  registrationEndpoint: 'https://vercel.com/api/login/oauth/register',
};

const PLANETSCALE_OPTS: IssuerMatchOpts = {
  authorizationEndpoint: 'https://app.planetscale.com/oauth/authorize',
  tokenEndpoint: 'https://auth.planetscale.com/oauth/token',
  registrationEndpoint: 'https://auth.planetscale.com/oauth/registration',
};

const NEW_RELIC_OPTS: IssuerMatchOpts = {
  authorizationEndpoint: 'https://login.newrelic.com/login',
  tokenEndpoint: 'https://mcp.newrelic.com/oauth2/token',
  registrationEndpoint: 'https://mcp.newrelic.com/register',
};

describe('isAcceptableIssuerMatch', () => {
  it('accepts exact issuer match', () => {
    expect(isAcceptableIssuerMatch('https://auth.example.com', 'https://auth.example.com')).to.equal(true);
  });

  it('accepts Auth0 tenant-suffix pattern (same origin, advertised has no path)', () => {
    expect(isAcceptableIssuerMatch('https://auth.atlassian.com/tenant', 'https://auth.atlassian.com')).to.equal(true);
  });

  it('accepts root issuers that differ only by trailing slash', () => {
    expect(isAcceptableIssuerMatch('https://auth.getmontecarlo.com/', 'https://auth.getmontecarlo.com')).to.equal(true);
  });

  it('accepts the Clerk delegated-issuer pattern', () => {
    expect(isAcceptableIssuerMatch('https://context7.com', 'https://clerk.context7.com', CONTEXT7_OPTS)).to.equal(true);
  });

  it('accepts the parent-domain issuer pattern (Vercel)', () => {
    expect(isAcceptableIssuerMatch('https://mcp.vercel.com', 'https://vercel.com', VERCEL_OPTS)).to.equal(true);
  });

  it('accepts the MCP well-known gateway pattern (PlanetScale)', () => {
    expect(
      isAcceptableIssuerMatch('https://mcp.pscale.dev/mcp/planetscale', 'https://api.planetscale.com', PLANETSCALE_OPTS)
    ).to.equal(true);
  });

  it('accepts the sibling-subdomain MCP gateway pattern (New Relic)', () => {
    expect(isAcceptableIssuerMatch('https://mcp.newrelic.com', 'https://login.newrelic.com', NEW_RELIC_OPTS)).to.equal(
      true
    );
  });

  it('rejects gateway pattern when OAuth endpoints leave the advertised domain', () => {
    expect(
      isAcceptableIssuerMatch('https://mcp.pscale.dev/mcp/planetscale', 'https://api.planetscale.com', {
        ...PLANETSCALE_OPTS,
        tokenEndpoint: 'https://evil.example/oauth/token',
      })
    ).to.equal(false);
  });

  it('rejects cross-origin issuer mismatch without a matching relaxation', () => {
    expect(isAcceptableIssuerMatch('https://auth.example.com', 'https://attacker.example')).to.equal(false);
  });

  it('rejects relaxations when OAuth endpoints are omitted', () => {
    expect(isAcceptableIssuerMatch('https://mcp.vercel.com', 'https://vercel.com')).to.equal(false);
  });

  it('rejects sibling relaxation when hosts share only a multi-level public suffix', () => {
    const opts: IssuerMatchOpts = {
      authorizationEndpoint: 'https://service.example.co.uk/oauth/authorize',
      tokenEndpoint: 'https://service.example.co.uk/oauth/token',
      registrationEndpoint: 'https://service.example.co.uk/oauth/register',
    };

    expect(isAcceptableIssuerMatch('https://service.example.co.uk', 'https://login.attacker.co.uk', opts)).to.equal(
      false
    );
  });
});
