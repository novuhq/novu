import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectApiClient } from '../api/client';

const listAgentIntegrations = vi.fn();

vi.mock('../api/agents', () => ({
  listAgentIntegrations: (...args: unknown[]) => listAgentIntegrations(...args),
  addAgentIntegration: vi.fn(),
}));

vi.mock('../api/integrations', () => ({
  listIntegrations: vi.fn(),
}));

import { pollForAgentLinkConnected } from './integration-helpers';

describe('pollForAgentLinkConnected', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects connectedAt on the agent integration link', async () => {
    listAgentIntegrations
      .mockResolvedValueOnce([
        {
          _id: 'link-1',
          integration: {
            _id: 'integration-1',
            identifier: 'telegram-main',
            name: 'Telegram',
            providerId: 'telegram',
            channel: 'chat',
            active: true,
          },
          connectedAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          _id: 'link-1',
          integration: {
            _id: 'integration-1',
            identifier: 'telegram-main',
            name: 'Telegram',
            providerId: 'telegram',
            channel: 'chat',
            active: true,
          },
          connectedAt: '2026-06-08T12:00:00.000Z',
        },
      ]);

    const connected = await pollForAgentLinkConnected({} as ConnectApiClient, 'my-agent', 'telegram-main', {
      intervalMs: 1,
      timeoutMs: 50,
    });

    expect(connected).toBe(true);
    expect(listAgentIntegrations).toHaveBeenCalledWith({}, 'my-agent', {
      integrationIdentifier: 'telegram-main',
      limit: 1,
    });
  });
});
