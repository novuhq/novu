import { ENDPOINT_TYPES, MsTeamsChannelData, MsTeamsUserData } from '@novu/stateless';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { MsTeamsProvider } from './msTeams.provider';
import { eTagToUniqueId, getFileType, isGuid, toSafeFileName } from './teams-files.utils';

type Method = 'get' | 'post' | 'put';
type Call = { method: Method; url: string; body?: unknown; config?: { headers?: Record<string, string> } };

const GRAPH = 'https://graph.microsoft.com/v1.0';
const BOT = 'https://smba.trafficmanager.net/teams/v3';
const TEAM_GROUP_ID = '8f1f2c3d-1111-4a4a-9b9b-0123456789ab';
const USER_OBJECT_ID = '0b7e7c35-2222-4c4c-8d8d-abcdefabcdef';
const ETAG_GUID = '1A2B3C4D-5E6F-4A1B-8C2D-3E4F5A6B7C8D';
const pdf = { name: 'report.pdf', mime: 'application/pdf', file: Buffer.from('%PDF-1.7 report') };

function httpError(status: number, message: string) {
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { error: { message } },
  } as AxiosResponse);
}

/** Routes every Graph and Bot Framework call made by the provider through one handler. */
function mockHttp(handler: (method: Method, url: string, body?: unknown) => unknown) {
  const calls: Call[] = [];
  const create = (method: Method) =>
    vi.fn(async (url: string, second?: unknown, third?: unknown) => {
      const body = method === 'get' ? undefined : second;
      const config = (method === 'get' ? second : third) as Call['config'];
      calls.push({ method, url, body, config });
      const result = handler(method, url, body);

      if (result instanceof Error) {
        throw result;
      }

      return { data: result, headers: {} };
    });

  vi.spyOn(axios, 'create').mockImplementation(
    () => ({ get: create('get'), post: create('post'), put: create('put') }) as never
  );

  return calls;
}

/** A Graph tenant where uploads succeed and Bot Framework accepts the card. */
function graphAndBotFramework(overrides: { post?: (url: string, body: unknown) => unknown } = {}) {
  return (method: Method, url: string, body?: unknown) => {
    if (method === 'get' && url.endsWith('/filesFolder')) {
      return { id: 'folder_1', name: 'General', parentReference: { driveId: 'drive_1' } };
    }

    if (method === 'get' && url.startsWith(`${BOT}/teams/`)) {
      return { id: '19:team@thread.tacv2', aadGroupId: TEAM_GROUP_ID };
    }

    if (method === 'get' && url.includes('/members/')) {
      return { id: '29:user', aadObjectId: USER_OBJECT_ID };
    }

    if (method === 'put') {
      return { id: 'item_1', name: 'report.pdf', parentReference: { driveId: 'drive_1' } };
    }

    if (method === 'get' && url.includes('/items/item_1?')) {
      return {
        id: 'item_1',
        name: 'report.pdf',
        eTag: `"{${ETAG_GUID}},1"`,
        webUrl: 'https://contoso.sharepoint.com/sites/team/Shared%20Documents/General/report.pdf',
        webDavUrl: 'https://contoso.sharepoint.com/sites/team/Shared Documents/General/report.pdf',
      };
    }

    if (method === 'post') {
      return overrides.post?.(url, body) ?? { id: 'activity_2' };
    }

    throw new Error(`Unexpected ${method} ${url}`);
  };
}

const teamsChannel: MsTeamsChannelData = {
  type: ENDPOINT_TYPES.MS_TEAMS_CHANNEL,
  identifier: 'teams-channel',
  endpoint: { teamId: TEAM_GROUP_ID, channelId: '19:channel@thread.tacv2' },
  subscriberTenantId: 'customer_tenant',
  token: 'bot-token',
  graphToken: 'graph-token',
};

const teamsUser: MsTeamsUserData = {
  type: ENDPOINT_TYPES.MS_TEAMS_USER,
  identifier: 'teams-user',
  endpoint: { userId: USER_OBJECT_ID },
  subscriberTenantId: 'customer_tenant',
  token: 'bot-token',
  clientId: 'bot-app-id',
  graphToken: 'graph-token',
};

describe('MsTeamsProvider.sendFiles', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('stores a channel file in the channel folder and posts a file card under the notification', async () => {
    const calls = mockHttp(graphAndBotFramework());
    const provider = new MsTeamsProvider({});

    const results = await provider.sendFiles({
      channelData: teamsChannel,
      files: [pdf],
      sentMessage: { id: '1700000000001', channel: '19:channel@thread.tacv2;messageid=1700000000001' },
    });

    expect(results).toEqual([{ name: 'report.pdf', status: 'sent' }]);

    expect(calls[0]).toMatchObject({
      method: 'get',
      url: `${GRAPH}/teams/${TEAM_GROUP_ID}/channels/${encodeURIComponent('19:channel@thread.tacv2')}/filesFolder`,
      config: { headers: { Authorization: 'Bearer graph-token' } },
    });
    expect(calls[1]).toMatchObject({
      method: 'put',
      url: `${GRAPH}/drives/drive_1/items/folder_1:/report.pdf:/content?@microsoft.graph.conflictBehavior=rename`,
      body: pdf.file,
      config: { headers: { Authorization: 'Bearer graph-token', 'Content-Type': 'application/pdf' } },
    });
    expect(calls[2].url).toBe(`${GRAPH}/drives/drive_1/items/item_1?$select=id,name,eTag,webUrl,webDavUrl`);
    expect(calls[3]).toEqual({
      method: 'post',
      url: `${BOT}/conversations/${encodeURIComponent('19:channel@thread.tacv2;messageid=1700000000001')}/activities`,
      body: {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.teams.card.file.info',
            contentUrl: 'https://contoso.sharepoint.com/sites/team/Shared Documents/General/report.pdf',
            name: 'report.pdf',
            content: { uniqueId: ETAG_GUID, fileType: 'pdf' },
          },
        ],
        channelData: {
          tenant: { id: 'customer_tenant' },
          team: { id: TEAM_GROUP_ID },
          channel: { id: '19:channel@thread.tacv2' },
        },
      },
      config: { headers: { Authorization: 'Bearer bot-token', 'Content-Type': 'application/json' } },
    });
    expect(calls).toHaveLength(4);
  });

  test('looks up the Entra group id when the endpoint stores the 19: team thread id', async () => {
    const calls = mockHttp(graphAndBotFramework());
    const provider = new MsTeamsProvider({});

    await provider.sendFiles({
      channelData: {
        ...teamsChannel,
        endpoint: { teamId: '19:team@thread.tacv2', channelId: '19:channel@thread.tacv2' },
      },
      files: [pdf],
      sentMessage: { id: '1700000000001' },
    });

    expect(calls[0]).toMatchObject({
      method: 'get',
      url: `${BOT}/teams/${encodeURIComponent('19:team@thread.tacv2')}`,
      config: { headers: { Authorization: 'Bearer bot-token' } },
    });
    expect(calls[1].url).toContain(`/teams/${TEAM_GROUP_ID}/channels/`);
    // Without a thread id the card starts its own post in the channel.
    expect(calls.at(-1)?.url).toBe(`${BOT}/conversations/${encodeURIComponent('19:channel@thread.tacv2')}/activities`);
  });

  test("stores a 1:1 file in the recipient's OneDrive and posts the card in the same chat", async () => {
    const calls = mockHttp(graphAndBotFramework());
    const provider = new MsTeamsProvider({});

    const results = await provider.sendFiles({
      channelData: teamsUser,
      files: [pdf],
      sentMessage: { id: 'activity_1', channel: 'a:1on1-conversation' },
    });

    expect(results).toEqual([{ name: 'report.pdf', status: 'sent' }]);
    expect(calls[0]).toMatchObject({
      method: 'put',
      url: `${GRAPH}/users/${USER_OBJECT_ID}/drive/root:/Microsoft%20Teams%20Chat%20Files/report.pdf:/content?@microsoft.graph.conflictBehavior=rename`,
    });
    expect(calls.at(-1)).toMatchObject({
      method: 'post',
      url: `${BOT}/conversations/${encodeURIComponent('a:1on1-conversation')}/activities`,
      body: { type: 'message', attachments: [expect.objectContaining({ name: 'report.pdf' })] },
    });
    expect((calls.at(-1)?.body as Record<string, unknown>).channelData).toBeUndefined();
  });

  test('resolves a 29: Teams user id to the Entra object id of their OneDrive', async () => {
    const calls = mockHttp(graphAndBotFramework());
    const provider = new MsTeamsProvider({});

    await provider.sendFiles({
      channelData: { ...teamsUser, endpoint: { userId: '29:user' } },
      files: [pdf],
      sentMessage: { id: 'activity_1', channel: 'a:1on1-conversation' },
    });

    expect(calls[0]).toMatchObject({
      method: 'get',
      url: `${BOT}/conversations/${encodeURIComponent('a:1on1-conversation')}/members/${encodeURIComponent('29:user')}`,
    });
    expect(calls[1].url).toContain(`/users/${USER_OBJECT_ID}/drive/`);
  });

  test('explains the missing Files.ReadWrite.All permission and uploads nothing', async () => {
    const calls = mockHttp((method, url) =>
      method === 'get' && url.endsWith('/filesFolder') ? httpError(403, 'Access denied') : { id: 'x' }
    );
    const provider = new MsTeamsProvider({});

    const results = await provider.sendFiles({
      channelData: teamsChannel,
      files: [pdf],
      sentMessage: { id: '1' },
    });

    expect(results).toEqual([
      { name: 'report.pdf', status: 'failed', reason: expect.stringContaining('Files.ReadWrite.All') },
    ]);
    expect(calls.filter((call) => call.method === 'put')).toHaveLength(0);
  });

  test("explains a recipient OneDrive that doesn't exist yet", async () => {
    mockHttp((method) => (method === 'put' ? httpError(404, 'Item not found') : { id: 'x' }));
    const provider = new MsTeamsProvider({});

    const results = await provider.sendFiles({
      channelData: teamsUser,
      files: [pdf],
      sentMessage: { channel: 'a:1on1-conversation' },
    });

    expect(results[0]).toEqual({
      name: 'report.pdf',
      status: 'failed',
      reason: expect.stringContaining("recipient's OneDrive was not found"),
    });
  });

  test('falls back to a link when Teams rejects the file card', async () => {
    const calls = mockHttp(
      graphAndBotFramework({
        post: (_url, body) =>
          JSON.stringify(body).includes('card.file.info') ? httpError(400, 'Unknown attachment type') : { id: 'a' },
      })
    );
    const provider = new MsTeamsProvider({});

    const results = await provider.sendFiles({
      channelData: teamsChannel,
      files: [pdf],
      sentMessage: { channel: '19:channel@thread.tacv2;messageid=1' },
    });

    expect(results).toEqual([
      { name: 'report.pdf', status: 'sent', reason: expect.stringContaining('Sent as a link') },
    ]);
    expect(calls.at(-1)?.body).toMatchObject({
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            actions: [
              {
                type: 'Action.OpenUrl',
                url: 'https://contoso.sharepoint.com/sites/team/Shared%20Documents/General/report.pdf',
              },
            ],
          },
        },
      ],
    });
  });

  test('skips files for Teams webhooks without calling Microsoft', async () => {
    const calls = mockHttp(() => ({}));
    const provider = new MsTeamsProvider({});

    const results = await provider.sendFiles({
      channelData: {
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'hook',
        endpoint: { url: 'https://example.webhook.office.com' },
      },
      files: [pdf],
      sentMessage: {},
    });

    expect(results).toEqual([
      { name: 'report.pdf', status: 'skipped', reason: expect.stringContaining("webhooks can't carry files") },
    ]);
    expect(calls).toHaveLength(0);
  });

  test('fails the files when no Graph token was provided', async () => {
    const calls = mockHttp(() => ({}));
    const provider = new MsTeamsProvider({});

    const results = await provider.sendFiles({
      channelData: { ...teamsChannel, graphToken: undefined },
      files: [pdf],
      sentMessage: {},
    });

    expect(results[0].status).toBe('failed');
    expect(calls).toHaveLength(0);
  });

  test('returns the 1:1 conversation id from sendMessage so files can follow the message', async () => {
    mockHttp((method, url) => (url.endsWith('/conversations') ? { id: 'a:1on1-conversation' } : { id: 'activity_1' }));
    const provider = new MsTeamsProvider({});

    const result = await provider.sendMessage({ channelData: teamsUser, content: 'Your report is ready' });

    expect(result).toMatchObject({ id: 'activity_1', channel: 'a:1on1-conversation' });
  });

  test("returns the channel post's thread from sendMessage", async () => {
    mockHttp(() => ({ id: '1700000000001' }));
    const provider = new MsTeamsProvider({});

    const result = await provider.sendMessage({ channelData: teamsChannel, content: 'Your report is ready' });

    expect(result.channel).toBe('19:channel@thread.tacv2;messageid=1700000000001');
  });
});

describe('Teams file helpers', () => {
  test('reads the GUID out of a drive item eTag', () => {
    expect(eTagToUniqueId(`"{${ETAG_GUID}},12"`)).toBe(ETAG_GUID);
    expect(eTagToUniqueId(undefined)).toBeUndefined();
    expect(eTagToUniqueId('"no-guid"')).toBeUndefined();
  });

  test('replaces characters SharePoint refuses in file names', () => {
    expect(toSafeFileName('Q3: "final" report?.pdf')).toBe('Q3_ _final_ report_.pdf');
    expect(toSafeFileName('notes. ')).toBe('notes');
    expect(toSafeFileName('///')).toBe('___');
    expect(toSafeFileName('   ')).toBe('file');
  });

  test('derives the Teams file type from the extension, then the MIME type', () => {
    expect(getFileType('Report.PDF', 'application/pdf')).toBe('pdf');
    expect(getFileType('rows', 'text/csv')).toBe('csv');
    expect(getFileType('blob', 'application/x-unknown')).toBe('file');
  });

  test('tells Entra group ids from Teams thread ids', () => {
    expect(isGuid(TEAM_GROUP_ID)).toBe(true);
    expect(isGuid('19:team@thread.tacv2')).toBe(false);
  });
});
