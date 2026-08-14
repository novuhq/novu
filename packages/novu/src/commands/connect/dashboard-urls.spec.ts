import { describe, expect, it } from 'vitest';
import { buildConnectAgentDetailsUrl } from './dashboard-urls';

describe('buildConnectAgentDetailsUrl', () => {
  const connectDashboardUrl = 'https://dashboard.novu.co';

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

  it('omits the env segment when no environment slug is available', () => {
    const url = buildConnectAgentDetailsUrl({
      connectDashboardUrl,
      environmentSlug: null,
      agentIdentifier: 'demo-scheduling-agent',
    });

    expect(url).toBe('https://dashboard.novu.co/agents/demo-scheduling-agent/overview');
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
