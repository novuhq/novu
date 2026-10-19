import { describe, expect, it, vi } from 'vitest';
import type { ConnectApiClient } from './client';
import { NovuApiError } from './client';
import {
  createWhatsAppSignupLink,
  getWhatsAppEmbeddedSignupAvailability,
  getWhatsAppSignupLinkStatus,
} from './integrations';

function clientWith(axios: Record<string, ReturnType<typeof vi.fn>>): ConnectApiClient {
  return { axios } as unknown as ConnectApiClient;
}

describe('getWhatsAppEmbeddedSignupAvailability', () => {
  it('unwraps the enveloped availability payload', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: { available: true } } });

    const availability = await getWhatsAppEmbeddedSignupAvailability(clientWith({ get }));

    expect(availability).toEqual({ available: true });
    expect(get).toHaveBeenCalledWith('/v1/integrations/whatsapp/embedded-signup/availability');
  });

  it('treats a 404 (older self-hosted API) as unavailable instead of failing', async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new NovuApiError('Not Found', 404, '/v1/integrations/whatsapp/embedded-signup/availability', {})
      );

    const availability = await getWhatsAppEmbeddedSignupAvailability(clientWith({ get }));

    expect(availability).toEqual({ available: false, reason: 'endpoint_not_found' });
  });

  it('rethrows non-404 errors', async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new NovuApiError('Server Error', 500, '/v1/integrations/whatsapp/embedded-signup/availability', {})
      );

    await expect(getWhatsAppEmbeddedSignupAvailability(clientWith({ get }))).rejects.toThrow('Server Error');
  });
});

describe('createWhatsAppSignupLink', () => {
  it('posts the agent + integration identifiers and unwraps the link payload', async () => {
    const link = {
      token: 'A'.repeat(32),
      url: `https://dashboard.novu.co/agents/whatsapp/connect/${'A'.repeat(32)}`,
      expiresAt: '2026-01-01T00:30:00.000Z',
    };
    const post = vi.fn().mockResolvedValue({ data: { data: link } });

    const result = await createWhatsAppSignupLink(clientWith({ post }), {
      agentIdentifier: 'my-agent',
      integrationIdentifier: 'whatsapp-main',
    });

    expect(result).toEqual(link);
    expect(post).toHaveBeenCalledWith('/v1/integrations/whatsapp/signup-link', {
      agentIdentifier: 'my-agent',
      integrationIdentifier: 'whatsapp-main',
    });
  });
});

describe('getWhatsAppSignupLinkStatus', () => {
  it('passes the token as a query param and unwraps the payload', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        data: { valid: true, agentName: 'My Agent', credentialsSaved: true, displayPhoneNumber: '+1 555-123-4567' },
      },
    });

    const status = await getWhatsAppSignupLinkStatus(clientWith({ get }), 'A'.repeat(32));

    expect(status).toEqual({
      valid: true,
      agentName: 'My Agent',
      credentialsSaved: true,
      displayPhoneNumber: '+1 555-123-4567',
    });
    expect(get).toHaveBeenCalledWith('/v1/integrations/whatsapp/signup/status', {
      params: { token: 'A'.repeat(32) },
    });
  });

  it('surfaces invalid links as valid: false', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: { valid: false, reason: 'expired' } } });

    const status = await getWhatsAppSignupLinkStatus(clientWith({ get }), 'A'.repeat(32));

    expect(status).toEqual({ valid: false, reason: 'expired' });
  });
});
