import { describe, expect, it, vi } from 'vitest';
import type { HumanApiClient } from './client';
import { generateConnectOauthUrl } from './setup';

function clientWith(axios: Record<string, ReturnType<typeof vi.fn>>): HumanApiClient {
  return { axios } as unknown as HumanApiClient;
}

describe('generateConnectOauthUrl', () => {
  it('requests a subscriber-scoped install without an agent context', async () => {
    const post = vi.fn().mockResolvedValue({ data: { data: { url: 'https://slack.com/oauth/v2/authorize' } } });

    const url = await generateConnectOauthUrl(clientWith({ post }), {
      integrationIdentifier: 'slack-main',
      agentIdentifier: 'my-agent',
      subscriberId: 'user_1',
    });

    expect(url).toEqual('https://slack.com/oauth/v2/authorize');
    // An `agent:<identifier>` context key would scope the resulting SLACK_USER endpoint,
    // hiding it from every unscoped workflow trigger. Setup, invite, and link-channel
    // all go through this helper.
    expect(post).toHaveBeenCalledWith('/v1/integrations/channel-connections/oauth', {
      integrationIdentifier: 'slack-main',
      subscriberId: 'user_1',
      connectionMode: 'subscriber',
      autoLinkUser: true,
    });
  });
});
