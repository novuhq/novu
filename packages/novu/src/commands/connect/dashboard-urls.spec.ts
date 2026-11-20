import { describe, expect, it } from 'vitest';
import { buildConnectAgentDetailsUrl, buildConnectClaimUrl, resolveConnectSuccessDestination } from './dashboard-urls';

const connectDashboardUrl = 'https://dashboard.novu.co';

describe('buildConnectAgentDetailsUrl', () => {
  it('points to the agent overview tab by default', () => {
    const url = buildConnectAgentDetailsUrl({
      connectDashboardUrl,
      environmentSlug: 'dev_env_gi4dYEokzvaKoGla',
      agentIdentifier: 'demo-scheduling-agent',
    });

    expect(url).toBe('https://dashboard.novu.co/env/dev_env_gi4dYEokzvaKoGla/agents/demo-scheduling-agent/overview');
  });

  it('points to the integrations tab when requested', () => {
    const url = buildConnectAgentDetailsUrl({
      connectDashboardUrl,
      environmentSlug: 'dev_env_gi4dYEokzvaKoGla',
      agentIdentifier: 'demo-scheduling-agent',
      tab: 'integrations',
    });

    expect(url).toBe(
      'https://dashboard.novu.co/env/dev_env_gi4dYEokzvaKoGla/agents/demo-scheduling-agent/integrations'
    );
  });

  it('falls back to the agents list when no environment slug is known', () => {
    const url = buildConnectAgentDetailsUrl({
      connectDashboardUrl,
      environmentSlug: null,
      agentIdentifier: 'demo-scheduling-agent',
    });

    // A slug-less deep link would be bounced to the workflows page by the
    // dashboard; `/agents` resolves to the default environment.
    expect(url).toBe('https://dashboard.novu.co/agents');
  });

  it('trims a trailing slash from the dashboard url and encodes the identifier', () => {
    const url = buildConnectAgentDetailsUrl({
      connectDashboardUrl: 'https://dashboard.novu.co/',
      environmentSlug: 'dev_env_1',
      agentIdentifier: 'my agent/id',
    });

    expect(url).toBe('https://dashboard.novu.co/env/dev_env_1/agents/my%20agent%2Fid/overview');
  });
});

describe('resolveConnectSuccessDestination', () => {
  const claimUrl = buildConnectClaimUrl({ connectDashboardUrl, token: 'claim-token-123' });

  it('sends keyless runs to the claim url instead of the dashboard', () => {
    const destination = resolveConnectSuccessDestination({
      connectDashboardUrl,
      environmentSlug: null,
      agentIdentifier: 'demo-scheduling-agent',
      isKeyless: true,
      claimUrl,
    });

    expect(destination).toEqual({
      kind: 'claim',
      url: 'https://dashboard.novu.co/connect/claim?token=claim-token-123',
    });
  });

  it('never links a keyless run into the dashboard, even with an environment slug', () => {
    const destination = resolveConnectSuccessDestination({
      connectDashboardUrl,
      environmentSlug: 'dev_env_1',
      agentIdentifier: 'demo-scheduling-agent',
      isKeyless: true,
      claimUrl,
    });

    expect(destination.kind).toBe('claim');
  });

  it('reports an unclaimed keyless run when no claim token was issued', () => {
    const destination = resolveConnectSuccessDestination({
      connectDashboardUrl,
      environmentSlug: null,
      agentIdentifier: 'demo-scheduling-agent',
      isKeyless: true,
      claimUrl: null,
    });

    expect(destination).toEqual({ kind: 'unclaimed' });
  });

  it('deep-links authenticated runs to the agent overview tab', () => {
    const destination = resolveConnectSuccessDestination({
      connectDashboardUrl,
      environmentSlug: 'dev_env_gi4dYEokzvaKoGla',
      agentIdentifier: 'demo-scheduling-agent',
      isKeyless: false,
      claimUrl: null,
    });

    expect(destination).toEqual({
      kind: 'dashboard',
      url: 'https://dashboard.novu.co/env/dev_env_gi4dYEokzvaKoGla/agents/demo-scheduling-agent/overview',
    });
  });
});
