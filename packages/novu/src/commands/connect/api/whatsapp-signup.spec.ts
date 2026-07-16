import { describe, expect, it, vi } from 'vitest';
import type { ConnectApiClient } from './client';
import { NovuApiError } from './client';
import { getWhatsAppEmbeddedSignupAvailability, getWhatsAppSignupStatus } from './integrations';

function clientWithGet(get: ReturnType<typeof vi.fn>): ConnectApiClient {
  return { axios: { get } } as unknown as ConnectApiClient;
}

describe('getWhatsAppEmbeddedSignupAvailability', () => {
  it('unwraps the enveloped availability payload', async () => {
    const get = vi.fn().mockResolvedValue({ data: { data: { available: true } } });

    const availability = await getWhatsAppEmbeddedSignupAvailability(clientWithGet(get));

    expect(availability).toEqual({ available: true });
    expect(get).toHaveBeenCalledWith('/v1/integrations/whatsapp/embedded-signup/availability');
  });

  it('treats a 404 (older self-hosted API) as unavailable instead of failing', async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new NovuApiError('Not Found', 404, '/v1/integrations/whatsapp/embedded-signup/availability', {})
      );

    const availability = await getWhatsAppEmbeddedSignupAvailability(clientWithGet(get));

    expect(availability).toEqual({ available: false, reason: 'endpoint_not_found' });
  });

  it('rethrows non-404 errors', async () => {
    const get = vi
      .fn()
      .mockRejectedValue(
        new NovuApiError('Server Error', 500, '/v1/integrations/whatsapp/embedded-signup/availability', {})
      );

    await expect(getWhatsAppEmbeddedSignupAvailability(clientWithGet(get))).rejects.toThrow('Server Error');
  });
});

describe('getWhatsAppSignupStatus', () => {
  it('passes the integration identifier and unwraps the payload', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { data: { credentialsSaved: true, displayPhoneNumber: '+1 555-123-4567' } },
    });

    const status = await getWhatsAppSignupStatus(clientWithGet(get), 'whatsapp-main');

    expect(status).toEqual({ credentialsSaved: true, displayPhoneNumber: '+1 555-123-4567' });
    expect(get).toHaveBeenCalledWith('/v1/integrations/whatsapp/signup-status', {
      params: { integrationIdentifier: 'whatsapp-main' },
    });
  });
});
