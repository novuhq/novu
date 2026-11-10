import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestForAccount } = vi.hoisted(() => ({ requestForAccount: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('./human-api-key', () => ({ requestForAccount, requestPageForAccount: vi.fn() }));

const { ensureWhatsAppChannel } = await import('./human-channels-api');

const account = { humanUserId: 'user_1' } as never;

/** Answers the calls `ensureWhatsAppChannel` makes, in the order it makes them. */
function answer({ linked = [], integrations = [] }: { linked?: unknown[]; integrations?: unknown[] }) {
  requestForAccount.mockImplementation(async (_account: unknown, path: string, init?: { method?: string }) => {
    if (path === '/v1/agents/human-relay/integrations' && !init?.method) {
      return linked;
    }
    if (path === '/v1/integrations' && !init?.method) {
      return integrations;
    }
    if (path === '/v1/integrations' && init?.method === 'POST') {
      return { _id: 'new-id', identifier: 'whatsapp-new', providerId: 'whatsapp-business', channel: 'chat' };
    }

    return {};
  });
}

describe('ensureWhatsAppChannel', () => {
  beforeEach(() => {
    requestForAccount.mockReset();
  });

  it('makes a new channel instead of reusing one that was turned off, which a signup could not land on', async () => {
    answer({
      integrations: [
        { _id: 'old-id', identifier: 'whatsapp-old', providerId: 'whatsapp-business', channel: 'chat', active: false },
      ],
    });

    await expect(ensureWhatsAppChannel(account)).resolves.toBe('whatsapp-new');

    const created = requestForAccount.mock.calls.find(([, path, init]) => path === '/v1/integrations' && init?.method);
    expect(created?.[2]).toMatchObject({ method: 'POST', body: { providerId: 'whatsapp-business', active: true } });
  });

  it('reuses an active WhatsApp integration and links it to the relay', async () => {
    answer({
      integrations: [
        { _id: 'act-id', identifier: 'whatsapp.main', providerId: 'whatsapp-business', channel: 'chat', active: true },
      ],
    });

    await expect(ensureWhatsAppChannel(account)).resolves.toBe('whatsapp.main');

    expect(requestForAccount.mock.calls.some(([, , init]) => init?.method === 'POST' && init.body?.providerId)).toBe(
      false
    );
    expect(requestForAccount.mock.calls.at(-1)?.[2]).toEqual({
      method: 'POST',
      body: { integrationIdentifier: 'whatsapp.main' },
    });
  });
});
