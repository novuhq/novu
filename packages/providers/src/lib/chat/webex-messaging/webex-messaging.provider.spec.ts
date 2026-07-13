import { ChatProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ENDPOINT_TYPES } from '@novu/stateless';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebexMessagingProvider } from './webex-messaging.provider';

vi.mock('axios');

describe('WebexMessagingProvider', () => {
  const post = vi.fn();

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('identifies as a Webex chat provider', () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    expect(provider.id).toBe(ChatProviderIdEnum.WebexMessaging);
    expect(provider.channelType).toBe(ChannelTypeEnum.CHAT);
  });

  it('uses the default Webex API base URL', () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    new WebexMessagingProvider();

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://webexapis.com/v1',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  });

  it('normalizes a custom Webex API base URL', () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    new WebexMessagingProvider({ baseUrl: 'https://webexapis.com/custom/' });

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://webexapis.com/custom',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  });

  it.each(['http://webexapis.com/v1', 'https://example.com/v1', 'not-a-url'])(
    'rejects unsafe Webex API base URL: %s',
    (baseUrl) => {
      expect(() => new WebexMessagingProvider({ baseUrl })).toThrow(
        'Webex Messaging baseUrl must be an HTTPS URL on webexapis.com'
      );
      expect(axios.create).not.toHaveBeenCalled();
    }
  );

  it('sends a room message', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);
    post.mockResolvedValue({
      data: {
        id: 'message-id',
        created: '2026-06-14T00:00:00.000Z',
      },
    });

    const provider = new WebexMessagingProvider();

    const result = await provider.sendMessage(
      {
        content: 'Build finished',
        channelData: {
          type: ENDPOINT_TYPES.WEBEX_ROOM,
          identifier: 'build-room',
          endpoint: { roomId: 'room-id' },
          token: 'token',
        },
      },
      {}
    );

    expect(post).toHaveBeenCalledWith(
      '/messages',
      {
        roomId: 'room-id',
        text: 'Build finished',
      },
      {
        headers: {
          Authorization: 'Bearer token',
        },
      }
    );
    expect(result).toEqual({
      id: 'message-id',
      date: '2026-06-14T00:00:00.000Z',
    });
  });

  it('sends a threaded room message when parentId is present', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);
    post.mockResolvedValue({ data: { id: 'message-id' } });

    const provider = new WebexMessagingProvider();

    await provider.sendMessage(
      {
        content: 'Thread reply',
        channelData: {
          type: ENDPOINT_TYPES.WEBEX_ROOM,
          identifier: 'build-room',
          endpoint: { roomId: 'room-id', parentId: 'parent-id' },
          token: 'token',
        },
      },
      {}
    );

    expect(post).toHaveBeenCalledWith(
      '/messages',
      {
        roomId: 'room-id',
        parentId: 'parent-id',
        text: 'Thread reply',
      },
      {
        headers: {
          Authorization: 'Bearer token',
        },
      }
    );
  });

  it('sends a direct message by person email', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);
    post.mockResolvedValue({ data: { id: 'message-id' } });

    const provider = new WebexMessagingProvider();

    await provider.sendMessage(
      {
        content: 'Hello',
        channelData: {
          type: ENDPOINT_TYPES.WEBEX_PERSON,
          identifier: 'person',
          endpoint: { personEmail: 'user@example.com' },
          token: 'token',
        },
      },
      {}
    );

    expect(post).toHaveBeenCalledWith(
      '/messages',
      {
        toPersonEmail: 'user@example.com',
        text: 'Hello',
      },
      {
        headers: {
          Authorization: 'Bearer token',
        },
      }
    );
  });

  it('sends a direct message by person id', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);
    post.mockResolvedValue({ data: { id: 'message-id' } });

    const provider = new WebexMessagingProvider();

    await provider.sendMessage(
      {
        content: 'Hello by id',
        channelData: {
          type: ENDPOINT_TYPES.WEBEX_PERSON,
          identifier: 'person',
          endpoint: { personId: 'person-id' },
          token: 'token',
        },
      },
      {}
    );

    expect(post).toHaveBeenCalledWith(
      '/messages',
      {
        toPersonId: 'person-id',
        text: 'Hello by id',
      },
      {
        headers: {
          Authorization: 'Bearer token',
        },
      }
    );
  });

  it('merges Webex passthrough fields into the payload', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);
    post.mockResolvedValue({ data: { id: 'message-id' } });

    const provider = new WebexMessagingProvider();

    await provider.sendMessage(
      {
        content: 'Build finished',
        channelData: {
          type: ENDPOINT_TYPES.WEBEX_ROOM,
          identifier: 'room',
          endpoint: { roomId: 'room-id' },
          token: 'token',
        },
      },
      {
        _passthrough: {
          body: {
            markdown: '**Build finished**',
            files: ['https://example.com/build.txt'],
          },
        },
      }
    );

    expect(post).toHaveBeenCalledWith(
      '/messages',
      {
        roomId: 'room-id',
        text: 'Build finished',
        markdown: '**Build finished**',
        files: ['https://example.com/build.txt'],
      },
      {
        headers: {
          Authorization: 'Bearer token',
        },
      }
    );
  });

  it('rejects passthrough that adds another destination to a room message', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id' },
            token: 'token',
          },
        },
        {
          _passthrough: {
            body: { toPersonEmail: 'user@example.com' },
          },
        }
      )
    ).rejects.toThrow('Webex messages require exactly one destination');
    expect(post).not.toHaveBeenCalled();
  });

  it.each([null, 123, ''])(
    'rejects passthrough with invalid secondary destination value: %s',
    async (toPersonEmail) => {
      vi.mocked(axios.create).mockReturnValue({ post } as never);

      const provider = new WebexMessagingProvider();

      await expect(
        provider.sendMessage(
          {
            content: 'Hello',
            channelData: {
              type: ENDPOINT_TYPES.WEBEX_ROOM,
              identifier: 'room',
              endpoint: { roomId: 'room-id' },
              token: 'token',
            },
          },
          {
            _passthrough: {
              body: { toPersonEmail },
            },
          }
        )
      ).rejects.toThrow('Webex messages require exactly one destination');
      expect(post).not.toHaveBeenCalled();
    }
  );

  it('rejects passthrough that removes the message destination', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id' },
            token: 'token',
          },
        },
        {
          _passthrough: {
            body: { roomId: undefined },
          },
        }
      )
    ).rejects.toThrow('Webex messages require exactly one destination');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects passthrough that changes the message destination', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id' },
            token: 'token',
          },
        },
        {
          _passthrough: {
            body: { roomId: 'other-room-id' },
          },
        }
      )
    ).rejects.toThrow('Webex passthrough cannot override message destination');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects passthrough that changes the thread destination', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id', parentId: 'parent-id' },
            token: 'token',
          },
        },
        {
          _passthrough: {
            body: { parentId: 'other-parent-id' },
          },
        }
      )
    ).rejects.toThrow('Webex passthrough cannot override message destination');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects passthrough that adds a thread destination', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id' },
            token: 'token',
          },
        },
        {
          _passthrough: {
            body: { parentId: 'parent-id' },
          },
        }
      )
    ).rejects.toThrow('Webex passthrough cannot override message destination');
    expect(post).not.toHaveBeenCalled();
  });

  it('requires channel data', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(provider.sendMessage({ content: 'Hello' }, {})).rejects.toThrow(
      'Webex Messaging channel data is required'
    );
  });

  it('requires roomId for room messages', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: {} as never,
            token: 'token',
          },
        },
        {}
      )
    ).rejects.toThrow('Webex room messages require roomId');
    expect(post).not.toHaveBeenCalled();
  });

  it('requires a non-empty parentId for threaded room messages', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id', parentId: '' },
            token: 'token',
          },
        },
        {}
      )
    ).rejects.toThrow('Webex threaded room messages require parentId');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects unsupported channel data types', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBHOOK,
            identifier: 'webhook',
            endpoint: { url: 'https://example.com/webhook' },
          },
        },
        {}
      )
    ).rejects.toThrow('Invalid channel data type for Webex Messaging provider: webhook');
    expect(post).not.toHaveBeenCalled();
  });

  it('requires personId or personEmail for direct messages', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_PERSON,
            identifier: 'person',
            endpoint: {} as never,
            token: 'token',
          },
        },
        {}
      )
    ).rejects.toThrow('Webex person messages require personId or personEmail');
  });

  it('rejects direct messages with both personId and personEmail', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_PERSON,
            identifier: 'person',
            endpoint: { personId: 'person-id', personEmail: 'user@example.com' } as never,
            token: 'token',
          },
        },
        {}
      )
    ).rejects.toThrow('Webex person messages require either personId or personEmail, not both');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects direct messages with both person endpoint keys even when one value is empty', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_PERSON,
            identifier: 'person',
            endpoint: { personId: '', personEmail: 'user@example.com' } as never,
            token: 'token',
          },
        },
        {}
      )
    ).rejects.toThrow('Webex person messages require either personId or personEmail, not both');
    expect(post).not.toHaveBeenCalled();
  });

  it('requires an access token', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id' },
          } as never,
        },
        {}
      )
    ).rejects.toThrow('Webex Messaging channel connection access token is required');
  });

  it('maps Webex 429 errors with retry context', async () => {
    vi.mocked(axios.create).mockReturnValue({ post } as never);
    const rateLimitError = {
      isAxiosError: true,
      response: {
        status: 429,
        headers: { 'retry-after': '30' },
        data: { message: 'Rate limit exceeded' },
      },
    };
    post.mockRejectedValue(rateLimitError);
    vi.mocked(axios.isAxiosError).mockImplementation((error) => error === rateLimitError);

    const provider = new WebexMessagingProvider();

    await expect(
      provider.sendMessage(
        {
          content: 'Hello',
          channelData: {
            type: ENDPOINT_TYPES.WEBEX_ROOM,
            identifier: 'room',
            endpoint: { roomId: 'room-id' },
            token: 'token',
          },
        },
        {}
      )
    ).rejects.toThrow('WEBEX_RATE_LIMITED: retry after 30 seconds');
  });
});
