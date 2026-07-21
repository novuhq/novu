import { TOOL_PROVIDER_OVERRIDE_KEYS, ToolProviderIdEnum } from '@novu/shared';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { ENDPOINT_TYPES, OpsgenieIntegrationData } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { OpsgenieProvider } from './opsgenie.provider';

/** Keys the provider maps onto the Alert API — must stay ⊆ the shared override inventory. */
const OPSGENIE_MAPPED_OVERRIDE_KEYS = [
  'message',
  'alias',
  'description',
  'source',
  'entity',
  'user',
  'note',
  'priority',
  'tags',
  'responders',
  'visibleTo',
  'actions',
  'details',
] as const;

const mockResponse = (requestId = 'req-1') => ({
  statusCode: 202,
  statusMessage: 'Accepted',
  headers: {},
  body: { requestId, result: 'Request will be processed' },
});

const channelData = (apiKey: string, region: 'us' | 'eu' = 'us'): OpsgenieIntegrationData => ({
  type: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
  identifier: 'og-endpoint-1',
  endpoint: { apiKey, region },
});

test('creates an alert on the US endpoint with GenieKey auth from channelData', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  const result = await provider.sendMessage({
    content: 'Payment service is down',
    channelData: channelData('og-test-key'),
  });

  expect(safeOutboundSpy).toHaveBeenCalledWith({
    url: 'https://api.opsgenie.com/v2/alerts',
    method: 'POST',
    headers: {
      Authorization: 'GenieKey og-test-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Payment service is down' }),
  });
  expect(result.id).toBe('req-1');

  safeOutboundSpy.mockRestore();
});

test('uses EU endpoint when region is eu', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  await provider.sendMessage({ content: 'ping', channelData: channelData('og-eu', 'eu') });

  expect(safeOutboundSpy).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://api.eu.opsgenie.com/v2/alerts' })
  );

  safeOutboundSpy.mockRestore();
});

test('throws when channelData is missing', async () => {
  const provider = new OpsgenieProvider();

  await expect(provider.sendMessage({ content: 'hello' })).rejects.toThrow(/channelData/i);
});

test('throws when channelData is the wrong type', async () => {
  const provider = new OpsgenieProvider();

  await expect(
    provider.sendMessage({
      content: 'hello',
      // Wrong discriminant on purpose: the provider must refuse to route.
      channelData: {
        type: ENDPOINT_TYPES.SLACK_CHANNEL,
        identifier: 's-1',
        endpoint: { channelId: 'C123' },
        token: 'xoxb-test',
      },
    })
  ).rejects.toThrow(/opsgenie_integration/i);
});

test('throws when endpoint apiKey is empty', async () => {
  const provider = new OpsgenieProvider();

  await expect(provider.sendMessage({ content: 'hello', channelData: channelData('') })).rejects.toThrow(
    /apiKey and a supported region/i
  );
});

test('throws when endpoint region is not a known Opsgenie region', async () => {
  const provider = new OpsgenieProvider();

  await expect(
    provider.sendMessage({
      content: 'hello',
      channelData: channelData('og-key', 'apac' as unknown as 'us'),
    })
  ).rejects.toThrow(/apiKey and a supported region/i);
});

test('auto-generates deterministic alias from transactionId+subscriberId+stepId', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  await provider.sendMessage({
    content: 'disk full',
    channelData: channelData('og-alias'),
    transactionId: 'txn-abc',
    subscriberId: 'sub-42',
    stepId: 'step-alert',
  });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.alias).toBe('novu:txn-abc:sub-42:step-alert');

  safeOutboundSpy.mockRestore();
});

test('customData.alias overrides the auto-generated alias', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  await provider.sendMessage(
    {
      content: 'disk full',
      channelData: channelData('og-alias'),
      transactionId: 'txn-abc',
      subscriberId: 'sub-42',
      stepId: 'step-alert',
    },
    { alias: 'my-custom-alias' }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.alias).toBe('my-custom-alias');

  safeOutboundSpy.mockRestore();
});

test('omits alias entirely when neither override nor identity IDs are present', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  await provider.sendMessage({ content: 'ping', channelData: channelData('og-noalias') });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body).not.toHaveProperty('alias');

  safeOutboundSpy.mockRestore();
});

test('truncates message to Opsgenie 130-character limit and passes optional fields', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());
  const longMessage = 'x'.repeat(200);

  const provider = new OpsgenieProvider();
  await provider.sendMessage(
    { content: longMessage, channelData: channelData('og-long') },
    {
      alias: 'billing-down',
      description: 'Full incident description',
      priority: 'P2',
      tags: ['billing', 'prod'],
      details: { service: 'billing' },
    }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.message).toHaveLength(130);
  expect(body.message.endsWith('…')).toBe(true);
  expect(body).toMatchObject({
    alias: 'billing-down',
    description: 'Full incident description',
    priority: 'P2',
    tags: ['billing', 'prod'],
    details: { service: 'billing' },
  });

  safeOutboundSpy.mockRestore();
});

test('ignores invalid priority values', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  await provider.sendMessage({ content: 'alert', channelData: channelData('og-prio') }, { priority: 'urgent' });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body).not.toHaveProperty('priority');

  safeOutboundSpy.mockRestore();
});

test('folds unknown bridge extras into details', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  await provider.sendMessage(
    { content: 'alert', channelData: channelData('og-extras') },
    {
      service: 'billing',
      details: { region: 'us-east-1' },
    }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.details).toEqual({
    service: 'billing',
    region: 'us-east-1',
  });

  safeOutboundSpy.mockRestore();
});

test('sends actions as a top-level Create Alert field', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieProvider();
  await provider.sendMessage(
    { content: 'alert', channelData: channelData('og-actions') },
    {
      actions: ['Restart', 'Acknowledge'],
      service: 'billing',
    }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.actions).toEqual(['Restart', 'Acknowledge']);
  expect(body.details).toEqual({ service: 'billing' });
  expect(body.details).not.toHaveProperty('actions');

  safeOutboundSpy.mockRestore();
});

test('mapped Alert API override keys stay inside the shared override inventory', () => {
  const inventory = new Set(TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.Opsgenie]);

  for (const key of OPSGENIE_MAPPED_OVERRIDE_KEYS) {
    expect(inventory.has(key), `mapped key "${key}" missing from TOOL_PROVIDER_OVERRIDE_KEYS`).toBe(true);
  }
});
