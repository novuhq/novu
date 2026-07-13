import { InboxService } from '../api';
import type { ChannelEndpointResponse } from '../channel-connections/types';
import { NovuEventEmitter } from '../event-emitter';
import { ChannelEndpoints } from './channel-endpoints';

type MockInboxService = Pick<
  InboxService,
  'isSessionInitialized' | 'linkChannelEndpoint' | 'listChannelEndpoints' | 'deleteChannelEndpoint'
>;

function createChannelEndpoints(overrides: Partial<MockInboxService> = {}) {
  const emitter = new NovuEventEmitter();
  const inboxService: MockInboxService = {
    isSessionInitialized: true,
    linkChannelEndpoint: jest.fn(),
    listChannelEndpoints: jest.fn(),
    deleteChannelEndpoint: jest.fn(),
    ...overrides,
  };

  const channelEndpoints = new ChannelEndpoints({
    inboxServiceInstance: inboxService as unknown as InboxService,
    eventEmitterInstance: emitter,
  });

  return { channelEndpoints, inboxService, emitter };
}

const TELEGRAM_LINK_RESPONSE = {
  url: 'https://t.me/TestBot?start=abc123',
  providerMetadata: { botUsername: 'TestBot', expiresAt: '2030-01-01T00:00:00.000Z' },
};

describe('ChannelEndpoints.link()', () => {
  it('posts the integration identifier and resolves with the link payload', async () => {
    const linkChannelEndpoint = jest.fn().mockResolvedValue(TELEGRAM_LINK_RESPONSE);
    const { channelEndpoints, emitter } = createChannelEndpoints({ linkChannelEndpoint });

    const pending = jest.fn();
    const resolved = jest.fn();
    emitter.on('channel-endpoint.link.pending', pending);
    emitter.on('channel-endpoint.link.resolved', resolved);

    const result = await channelEndpoints.link({ integrationIdentifier: 'telegram-bot' });

    expect(linkChannelEndpoint).toHaveBeenCalledWith({ integrationIdentifier: 'telegram-bot' });
    expect(result.data).toEqual(TELEGRAM_LINK_RESPONSE);
    expect(result.error).toBeUndefined();
    expect(pending).toHaveBeenCalledTimes(1);
    expect(resolved).toHaveBeenCalledWith(
      expect.objectContaining({ args: { integrationIdentifier: 'telegram-bot' }, data: TELEGRAM_LINK_RESPONSE })
    );
  });

  it('returns an error result and emits resolved with error when the request fails', async () => {
    const failure = new Error('boom');
    const linkChannelEndpoint = jest.fn().mockRejectedValue(failure);
    const { channelEndpoints, emitter } = createChannelEndpoints({ linkChannelEndpoint });

    const resolved = jest.fn();
    emitter.on('channel-endpoint.link.resolved', resolved);

    const result = await channelEndpoints.link({ integrationIdentifier: 'telegram-bot' });

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toContain('Failed to link channel endpoint');
    expect(resolved).toHaveBeenCalledWith(expect.objectContaining({ error: failure }));
  });
});

describe('Telegram connect/poll/disconnect flow', () => {
  const LIST_ARGS = { integrationIdentifier: 'telegram-bot', providerId: 'telegram', subscriberId: 'sub-1', limit: 1 };
  const ENDPOINT: ChannelEndpointResponse = { identifier: 'tg-endpoint-1', type: 'telegram_chat' };

  it('detects "not connected" when no endpoint exists yet', async () => {
    const listChannelEndpoints = jest.fn().mockResolvedValue({ data: [] });
    const { channelEndpoints } = createChannelEndpoints({ listChannelEndpoints });

    const result = await channelEndpoints.list(LIST_ARGS);

    expect(listChannelEndpoints).toHaveBeenCalledWith(LIST_ARGS);
    expect(result.data).toEqual([]);
  });

  it('connects: link -> poll until a telegram_chat endpoint appears', async () => {
    const linkChannelEndpoint = jest.fn().mockResolvedValue(TELEGRAM_LINK_RESPONSE);
    // First poll: still empty. Second poll: endpoint present.
    const listChannelEndpoints = jest
      .fn()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [ENDPOINT] });
    const { channelEndpoints } = createChannelEndpoints({ linkChannelEndpoint, listChannelEndpoints });

    const linkResult = await channelEndpoints.link({ integrationIdentifier: 'telegram-bot' });
    expect(linkResult.data?.url).toEqual(TELEGRAM_LINK_RESPONSE.url);

    const firstPoll = await channelEndpoints.list(LIST_ARGS);
    expect(firstPoll.data).toEqual([]);

    const secondPoll = await channelEndpoints.list(LIST_ARGS);
    expect(secondPoll.data?.[0]).toEqual(ENDPOINT);
  });

  it('disconnects: deletes the endpoint by identifier', async () => {
    const deleteChannelEndpoint = jest.fn().mockResolvedValue(undefined);
    const { channelEndpoints } = createChannelEndpoints({ deleteChannelEndpoint });

    const result = await channelEndpoints.delete({ identifier: ENDPOINT.identifier });

    expect(deleteChannelEndpoint).toHaveBeenCalledWith(ENDPOINT.identifier);
    expect(result.error).toBeUndefined();
  });
});

describe('InboxService.linkChannelEndpoint network contract', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs to /v1/inbox/channel-endpoints/link with only the integration identifier', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: TELEGRAM_LINK_RESPONSE }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new InboxService({ apiUrl: 'https://test.novu.co' });
    const response = await service.linkChannelEndpoint({ integrationIdentifier: 'telegram-bot' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://test.novu.co/v1/inbox/channel-endpoints/link',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ integrationIdentifier: 'telegram-bot' }),
      })
    );
    expect(response).toEqual(TELEGRAM_LINK_RESPONSE);
  });
});
