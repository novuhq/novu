import { ENDPOINT_TYPES, IChatOptions } from '@novu/stateless';
import axios from 'axios';
import { createHmac } from 'crypto';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  __setPhotonSpectrumImportForTests,
  clearPhotonImessageCaches,
  PhotonImessageChatProvider,
} from './photon-imessage.provider';

const mockProviderConfig = {
  projectId: 'project-id',
  projectSecret: 'project-secret',
};

const SPECTRUM_URL = 'https://spectrum.photon.codes';
const USERS_URL = `${SPECTRUM_URL}/projects/${mockProviderConfig.projectId}/users`;

const buildOptions = (phoneNumber = '+15551234567'): IChatOptions => ({
  content: 'Simple text message',
  channelData: {
    identifier: '-',
    type: ENDPOINT_TYPES.PHONE,
    endpoint: { phoneNumber },
  },
});

/** Axios spy for the REST shared-user registration leg. */
const usersApiSpy = (
  userResponse: Record<string, unknown> = {
    succeed: true,
    data: { id: 'user-id', assignedPhoneNumber: '+15550001111' },
  }
) => {
  const mockPost = vi.fn((url: string, _body?: Record<string, unknown>) => {
    if (url === USERS_URL) return Promise.resolve({ data: userResponse });
    throw new Error(`Unexpected POST to ${url}`);
  });

  vi.spyOn(axios, 'create').mockImplementation(() => ({ post: mockPost }) as never);

  return { mockPost };
};

/** Fake spectrum-ts module graph injected through the provider's ESM-import seam. */
const spectrumSpy = ({
  sendResult = { id: 'spectrum-message-id' },
  sendError,
}: {
  sendResult?: { id: string } | undefined;
  sendError?: Error;
} = {}) => {
  const send = vi.fn(async (..._contents: unknown[]) => {
    if (sendError) throw sendError;

    return sendResult;
  });
  const spaceCreate = vi.fn(async () => ({ send }));
  const user = vi.fn(async (address: string) => ({ address }));
  const stop = vi.fn(async () => {});
  const spectrumFactory = vi.fn(async () => ({ stop }));
  const imessageNarrow = Object.assign(
    vi.fn(() => ({ user, space: { create: spaceCreate } })),
    {
      config: vi.fn(() => ({ platform: 'imessage' })),
      effect: { message: { confetti: 'com.apple.messages.effect.CKConfettiEffect' } },
    }
  );
  const effectBuilder = vi.fn((content: unknown, effectValue: string) => ({ kind: 'effect', content, effectValue }));

  __setPhotonSpectrumImportForTests(async (specifier: string) => {
    if (specifier === '@spectrum-ts/core') {
      return {
        Spectrum: spectrumFactory,
        markdown: (source: string) => ({ kind: 'markdown', source }),
        attachment: (input: string) => ({ kind: 'attachment', input }),
        voice: (input: string) => ({ kind: 'voice', input }),
        reply: (content: unknown, target: unknown) => ({ kind: 'reply', content, target }),
      };
    }
    if (specifier === '@spectrum-ts/imessage') {
      return { imessage: imessageNarrow, effect: effectBuilder };
    }
    throw new Error(`Unexpected import: ${specifier}`);
  });

  return { send, spaceCreate, user, stop, spectrumFactory, imessageNarrow, effectBuilder };
};

beforeEach(() => {
  clearPhotonImessageCaches();
  vi.restoreAllMocks();
});

afterEach(() => {
  clearPhotonImessageCaches();
  __setPhotonSpectrumImportForTests(undefined);
});

test('should register the recipient and send through spectrum-ts', async () => {
  const { mockPost } = usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  const res = await provider.sendMessage(buildOptions());

  expect(mockPost).toHaveBeenCalledWith(USERS_URL, { type: 'shared', phoneNumber: '+15551234567' });

  expect(spectrum.spectrumFactory).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: mockProviderConfig.projectId,
      projectSecret: mockProviderConfig.projectSecret,
    })
  );
  expect(spectrum.user).toHaveBeenCalledWith('+15551234567');
  expect(spectrum.send).toHaveBeenCalledWith({ kind: 'markdown', source: 'Simple text message' });

  expect(res.id).toBe('spectrum-message-id');
  expect(res.date).toEqual(expect.any(String));
});

test('should reuse the cached spectrum app and recipient across sends', async () => {
  const { mockPost } = usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await provider.sendMessage(buildOptions());
  await provider.sendMessage(buildOptions());

  expect(spectrum.spectrumFactory).toHaveBeenCalledTimes(1);
  expect(spectrum.send).toHaveBeenCalledTimes(2);
  expect(mockPost).toHaveBeenCalledTimes(1);
});

test('should send plain text when format is forced to text', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await provider.sendMessage(buildOptions(), { format: 'text' });

  expect(spectrum.send).toHaveBeenCalledWith('Simple text message');
});

test('should let _passthrough override the message text', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await provider.sendMessage(buildOptions(), {
    _passthrough: { body: { text: 'Overridden text' } },
  });

  expect(spectrum.send).toHaveBeenCalledWith({ kind: 'markdown', source: 'Overridden text' });
});

test('should surface an opt-in error on PERMISSION_DENIED', async () => {
  usersApiSpy();
  spectrumSpy({
    sendError: Object.assign(new Error('7 PERMISSION_DENIED: not eligible'), { details: 'not eligible' }),
  });

  const provider = new PhotonImessageChatProvider(mockProviderConfig);

  await expect(provider.sendMessage(buildOptions())).rejects.toThrow(
    /must text \+15550001111 \(their assigned Photon number\)/
  );
});

test('should surface an opt-in error naming the assigned number when the shared proxy rejects the target', async () => {
  usersApiSpy();
  spectrumSpy({ sendError: new Error('[spectrum-imessage] Target not allowed for this project') });

  const provider = new PhotonImessageChatProvider(mockProviderConfig);

  await expect(provider.sendMessage(buildOptions())).rejects.toThrow(
    /^\+15551234567 must text \+15550001111 \(their assigned Photon number\) once, or accept an invite, before this project can message them\.$/
  );
});

test('should drop the cached app and surface a credentials error on invalid token', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy({ sendError: new Error('[spectrum-imessage] Invalid token') });

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await expect(provider.sendMessage(buildOptions())).rejects.toThrow(/rejected the project credentials/);

  // The poisoned app was evicted: the next send boots a fresh spectrum app.
  await expect(provider.sendMessage(buildOptions())).rejects.toThrow();
  expect(spectrum.spectrumFactory).toHaveBeenCalledTimes(2);
});

test('should not poison the cache when the spectrum app fails to boot', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy();
  spectrum.spectrumFactory.mockRejectedValueOnce(new Error('boot failed'));

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await expect(provider.sendMessage(buildOptions())).rejects.toThrow(/boot failed/);

  const res = await provider.sendMessage(buildOptions());
  expect(res.id).toBe('spectrum-message-id');
});

test('should render Rich Chat cards to markdown with format metadata', async () => {
  spectrumSpy();
  const provider = new PhotonImessageChatProvider(mockProviderConfig);

  const result = await provider.render({
    type: 'card',
    title: 'Order shipped',
    children: [
      { type: 'text', content: 'Your package is on the way.' },
      { type: 'link', label: 'Track it', url: 'https://example.com/track' },
    ],
  } as never);

  expect(result.nativePayload).toEqual({ format: 'markdown' });
  expect(result.content).toBe(
    '**Order shipped**\n\nYour package is on the way.\n\n[Track it](https://example.com/track)'
  );
});

test('should send rendered card content through the markdown builder', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await provider.sendMessage({
    ...buildOptions(),
    content: '**Order shipped**',
    nativePayload: { format: 'markdown' },
  });

  expect(spectrum.send).toHaveBeenCalledWith({ kind: 'markdown', source: '**Order shipped**' });
});

test('should wrap the message in an expressive effect from provider overrides', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await provider.sendMessage(buildOptions(), { effect: 'confetti' });

  expect(spectrum.send).toHaveBeenCalledWith({
    kind: 'effect',
    content: { kind: 'markdown', source: 'Simple text message' },
    effectValue: 'com.apple.messages.effect.CKConfettiEffect',
  });
});

test('should send attachments and voice notes from provider overrides', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await provider.sendMessage(buildOptions(), {
    attachments: ['https://example.com/photo.jpg'],
    voice: 'https://example.com/note.m4a',
  });

  expect(spectrum.send).toHaveBeenCalledWith(
    { kind: 'markdown', source: 'Simple text message' },
    { kind: 'attachment', input: 'https://example.com/photo.jpg' },
    { kind: 'voice', input: 'https://example.com/note.m4a' }
  );
});

test('should reply-thread to the previous message when replyToLast is set', async () => {
  usersApiSpy();
  const spectrum = spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  await provider.sendMessage(buildOptions());
  await provider.sendMessage(buildOptions(), { replyToLast: true });

  expect(spectrum.send).toHaveBeenLastCalledWith({
    kind: 'reply',
    content: { kind: 'markdown', source: 'Simple text message' },
    target: { id: 'spectrum-message-id' },
  });
});

test('should fail with an actionable error when recipient registration fails', async () => {
  usersApiSpy({ succeed: false, data: null, code: 'CONFLICT', message: 'no shared numbers left' });
  spectrumSpy();

  const provider = new PhotonImessageChatProvider(mockProviderConfig);

  await expect(provider.sendMessage(buildOptions())).rejects.toThrow(/could not register recipient/);
});

const SIGNING_KEY = 'delivery-webhook-signing-key';

const signDelivery = (timestamp: string, rawBody: string) =>
  createHmac('sha256', SIGNING_KEY).update(`v0:${timestamp}:${rawBody}`).digest('hex');

const buildReadReceiptBody = () =>
  JSON.stringify({
    event: 'messages',
    message: {
      id: 'guid:read:42',
      direction: 'inbound',
      timestamp: '2026-08-18T20:00:00.000Z',
      content: { type: 'read', target: { id: 'spectrum-message-id' } },
    },
  });

test('verifySignature accepts a valid Spectrum v0 signature and rejects a tampered one', async () => {
  const provider = new PhotonImessageChatProvider({ ...mockProviderConfig, webhookSigningKey: SIGNING_KEY });
  const rawBody = buildReadReceiptBody();
  const timestamp = String(Math.floor(Date.now() / 1000));

  const valid = await provider.verifySignature({
    rawBody,
    headers: {
      'X-Spectrum-Timestamp': timestamp,
      'X-Spectrum-Signature': `v0=${signDelivery(timestamp, rawBody)}`,
    },
  });
  expect(valid.success).toBe(true);

  const tampered = await provider.verifySignature({
    rawBody: `${rawBody} `,
    headers: {
      'x-spectrum-timestamp': timestamp,
      'x-spectrum-signature': `v0=${signDelivery(timestamp, rawBody)}`,
    },
  });
  expect(tampered.success).toBe(false);
});

test('verifySignature passes when no signing key is configured', async () => {
  const provider = new PhotonImessageChatProvider(mockProviderConfig);

  const result = await provider.verifySignature({ rawBody: '{}', headers: {} });
  expect(result.success).toBe(true);
});

test('getMessageId correlates read receipts and outbound echoes, skips inbound texts', () => {
  const provider = new PhotonImessageChatProvider(mockProviderConfig);

  expect(provider.getMessageId(buildReadReceiptBody())).toEqual(['spectrum-message-id']);
  expect(
    provider.getMessageId(JSON.stringify({ event: 'messages', message: { id: 'echo-id', direction: 'outbound' } }))
  ).toEqual(['echo-id']);
  expect(
    provider.getMessageId(
      JSON.stringify({
        event: 'messages',
        message: { id: 'user-msg', direction: 'inbound', content: { type: 'text', text: 'hi' } },
      })
    )
  ).toEqual([]);
});

test('parseEventBody maps read receipts to opened and echoes to delivered', () => {
  const provider = new PhotonImessageChatProvider(mockProviderConfig);

  const read = provider.parseEventBody(buildReadReceiptBody(), 'spectrum-message-id') as {
    status: string;
    date: string;
  };
  expect(read.status).toBe('opened');
  expect(read.date).toBe('2026-08-18T20:00:00.000Z');

  const echo = provider.parseEventBody(
    JSON.stringify({ event: 'messages', message: { id: 'echo-id', direction: 'outbound' } }),
    'echo-id'
  ) as { status: string };
  expect(echo.status).toBe('delivered');
});

test('autoConfigureInboundWebhook registers the URL and returns the Photon-issued secret', async () => {
  const webhooksUrl = `${SPECTRUM_URL}/projects/${mockProviderConfig.projectId}/webhooks`;
  const mockGet = vi.fn(async () => ({
    data: { succeed: true, data: [{ id: 'stale-id', webhookUrl: 'https://novu.example/hook' }] },
  }));
  const mockDelete = vi.fn(async () => ({ data: { succeed: true, data: {} } }));
  const mockPost = vi.fn(async (url: string) => {
    if (url === webhooksUrl) {
      return { data: { succeed: true, data: { id: 'wh-1', signingSecret: 'v0-secret-new', standardSigningSecret: 'whsec_new' } } };
    }
    throw new Error(`Unexpected POST to ${url}`);
  });
  vi.spyOn(axios, 'create').mockImplementation(() => ({ post: mockPost, get: mockGet, delete: mockDelete }) as never);

  const provider = new PhotonImessageChatProvider(mockProviderConfig);
  const result = await provider.autoConfigureInboundWebhook({ webhookUrl: 'https://novu.example/hook' });

  expect(mockDelete).toHaveBeenCalledWith(`${webhooksUrl}/stale-id`);
  expect(result).toEqual({
    success: true,
    configurations: { inboundWebhookEnabled: true, inboundWebhookSigningKey: 'v0-secret-new' },
  });
});
