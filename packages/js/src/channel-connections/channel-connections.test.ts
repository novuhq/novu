import { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import { ChannelConnections } from './channel-connections';
import type { ChannelConnectionResponse } from './types';

type MockInboxService = Pick<
  InboxService,
  'isSessionInitialized' | 'listChannelConnections' | 'getChannelConnection' | 'deleteChannelConnection'
>;

function createChannelConnections(overrides: Partial<MockInboxService> = {}) {
  const emitter = new NovuEventEmitter();
  const inboxService: MockInboxService = {
    isSessionInitialized: true,
    listChannelConnections: jest.fn(),
    getChannelConnection: jest.fn(),
    deleteChannelConnection: jest.fn(),
    ...overrides,
  };

  const channelConnections = new ChannelConnections({
    inboxServiceInstance: inboxService as unknown as InboxService,
    eventEmitterInstance: emitter,
  });

  return { channelConnections, inboxService, emitter };
}

const SUBSCRIBER_CONNECTION: ChannelConnectionResponse = {
  identifier: 'slack:sub-1',
  workspace: { id: 'T111', name: 'Acme' },
  createdAt: '2030-01-01T00:00:00.000Z',
};

const SHARED_CONNECTION: ChannelConnectionResponse = {
  identifier: 'novu-copilot-slack:org-1',
  workspace: { id: 'T222', name: 'Novu' },
  createdAt: '2030-01-02T00:00:00.000Z',
};

describe('ChannelConnections.list()', () => {
  it('returns the subscriber-owned and shared connections together', async () => {
    const listChannelConnections = jest.fn().mockResolvedValue({ data: [SUBSCRIBER_CONNECTION, SHARED_CONNECTION] });
    const { channelConnections } = createChannelConnections({ listChannelConnections });

    const result = await channelConnections.list();

    expect(listChannelConnections).toHaveBeenCalledWith({});
    expect(result.data).toEqual([SUBSCRIBER_CONNECTION, SHARED_CONNECTION]);
    expect(result.error).toBeUndefined();
  });

  it('forwards connectionMode so callers can narrow to shared connections', async () => {
    const listChannelConnections = jest.fn().mockResolvedValue({ data: [SHARED_CONNECTION] });
    const { channelConnections } = createChannelConnections({ listChannelConnections });

    const result = await channelConnections.list({ connectionMode: 'shared' });

    expect(listChannelConnections).toHaveBeenCalledWith({ connectionMode: 'shared' });
    expect(result.data).toEqual([SHARED_CONNECTION]);
  });
});

describe('ChannelConnections.get()', () => {
  it('resolves a shared connection by identifier', async () => {
    const getChannelConnection = jest.fn().mockResolvedValue(SHARED_CONNECTION);
    const { channelConnections } = createChannelConnections({ getChannelConnection });

    const result = await channelConnections.get({ identifier: SHARED_CONNECTION.identifier });

    expect(getChannelConnection).toHaveBeenCalledWith(SHARED_CONNECTION.identifier);
    expect(result.data).toEqual(SHARED_CONNECTION);
    expect(result.error).toBeUndefined();
  });
});

describe('ChannelConnections.delete()', () => {
  it('deletes a shared connection by identifier', async () => {
    const deleteChannelConnection = jest.fn().mockResolvedValue(undefined);
    const { channelConnections } = createChannelConnections({ deleteChannelConnection });

    const result = await channelConnections.delete({ identifier: SHARED_CONNECTION.identifier });

    expect(deleteChannelConnection).toHaveBeenCalledWith(SHARED_CONNECTION.identifier);
    expect(result.error).toBeUndefined();
  });
});

describe('InboxService.listChannelConnections network contract', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('appends connectionMode to the query string', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [SHARED_CONNECTION] }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = new InboxService({ apiUrl: 'https://test.novu.co' });
    await service.listChannelConnections({ connectionMode: 'shared' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/inbox/channel-connections?connectionMode=shared'),
      expect.objectContaining({ method: 'GET' })
    );
  });
});
