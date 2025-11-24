import { ENDPOINT_TYPES } from '@novu/stateless';
import { v4 as uuidv4 } from 'uuid';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { MsTeamsProvider } from './msTeams.provider';

test('should trigger msTeams webhook correctly', async () => {
  const { mockPost: fakePost } = axiosSpy({
    headers: { 'request-id': uuidv4() },
  });

  const provider = new MsTeamsProvider({});

  const testWebhookUrl = 'https://mycompany.webhook.office.com';
  const testContent = '{"title": "Message test title"}';
  await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: testContent,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    title: 'Message test title',
  });
});

test('should trigger msTeams webhook correctly with _passthrough', async () => {
  const { mockPost: fakePost } = axiosSpy({
    headers: { 'request-id': uuidv4() },
  });

  const provider = new MsTeamsProvider({});

  const testWebhookUrl = 'https://mycompany.webhook.office.com';
  const testContent = '{"title": "Message test title"}';
  await provider.sendMessage(
    {
      channelData: {
        endpoint: {
          url: testWebhookUrl,
        },
        type: ENDPOINT_TYPES.WEBHOOK,
        identifier: 'test-webhook-identifier',
      },
      content: testContent,
    },
    {
      _passthrough: {
        body: {
          title: '_passthrough test title',
        },
      },
    }
  );

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    title: '_passthrough test title',
  });
});

test('should handle plain text content in webhook', async () => {
  const { mockPost: fakePost } = axiosSpy({
    headers: { 'request-id': uuidv4() },
  });

  const provider = new MsTeamsProvider({});

  const testWebhookUrl = 'https://mycompany.webhook.office.com';
  const testContent = 'Plain text message';
  await provider.sendMessage({
    channelData: {
      endpoint: {
        url: testWebhookUrl,
      },
      type: ENDPOINT_TYPES.WEBHOOK,
      identifier: 'test-webhook-identifier',
    },
    content: testContent,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(testWebhookUrl, {
    text: 'Plain text message',
  });
});

test('should send message to MS Teams channel correctly', async () => {
  const activityId = uuidv4();
  const { mockPost: fakePost } = axiosSpy({
    data: { id: activityId },
  });

  const provider = new MsTeamsProvider({});

  const testContent = 'Test channel message';
  const testToken = 'test-bearer-token';
  const testTeamId = 'team-123';
  const testChannelId = 'channel-456';
  const testTenantId = 'tenant-789';

  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        teamId: testTeamId,
        channelId: testChannelId,
      },
      type: ENDPOINT_TYPES.MS_TEAMS_CHANNEL,
      identifier: 'test-channel-identifier',
      subscriberTenantId: testTenantId,
      token: testToken,
    },
    content: testContent,
  });

  expect(fakePost).toHaveBeenCalled();
  expect(fakePost).toHaveBeenCalledWith(
    `https://smba.trafficmanager.net/teams/v3/conversations/${encodeURIComponent(testChannelId)}/activities`,
    {
      type: 'message',
      text: testContent,
      channelData: {
        tenant: { id: testTenantId },
        team: { id: testTeamId },
        channel: { id: testChannelId },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  expect(result.id).toBe(activityId);
  expect(result.date).toBeDefined();
});

test('should send message to MS Teams user correctly', async () => {
  const conversationId = uuidv4();
  const activityId = uuidv4();

  const { mockPost: fakePost } = axiosSpy();

  fakePost
    .mockReturnValueOnce({
      data: { id: conversationId },
      headers: {},
    })
    .mockReturnValueOnce({
      data: { id: activityId },
      headers: {},
    });

  const provider = new MsTeamsProvider({});

  const testContent = 'Test user message';
  const testToken = 'test-bearer-token';
  const testUserId = 'user-123';
  const testTenantId = 'tenant-789';
  const testClientId = 'client-456';

  const result = await provider.sendMessage({
    channelData: {
      endpoint: {
        userId: testUserId,
      },
      type: ENDPOINT_TYPES.MS_TEAMS_USER,
      identifier: 'test-user-identifier',
      subscriberTenantId: testTenantId,
      token: testToken,
      clientId: testClientId,
    },
    content: testContent,
  });

  expect(fakePost).toHaveBeenCalledTimes(2);

  expect(fakePost).toHaveBeenNthCalledWith(
    1,
    'https://smba.trafficmanager.net/teams/v3/conversations',
    {
      isGroup: false,
      bot: { id: testClientId },
      members: [{ id: testUserId }],
      channelData: {
        tenant: { id: testTenantId },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  expect(fakePost).toHaveBeenNthCalledWith(
    2,
    `https://smba.trafficmanager.net/teams/v3/conversations/${encodeURIComponent(conversationId)}/activities`,
    {
      type: 'message',
      text: testContent,
    },
    {
      headers: {
        Authorization: `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  expect(result.id).toBe(activityId);
  expect(result.date).toBeDefined();
});
