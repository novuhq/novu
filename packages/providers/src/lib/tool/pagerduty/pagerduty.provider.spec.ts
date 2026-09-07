import { TOOL_PROVIDER_OVERRIDE_KEYS, ToolProviderIdEnum } from '@novu/shared';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { ENDPOINT_TYPES, PagerDutyServiceData } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { PagerDutyProvider } from './pagerduty.provider';

/** Keys the provider maps onto the Events API — must stay ⊆ the shared override inventory. */
const PAGERDUTY_MAPPED_OVERRIDE_KEYS = [
  'summary',
  'source',
  'severity',
  'event_action',
  'dedup_key',
  'custom_details',
  'timestamp',
  'component',
  'group',
  'class',
  'client',
  'client_url',
  'links',
  'images',
] as const;

const mockResponse = (dedupKey = 'dedup-1') => ({
  statusCode: 202,
  statusMessage: 'Accepted',
  headers: {},
  body: { dedup_key: dedupKey, status: 'success', message: 'Event processed' },
});

const channelData = (routingKey: string, region: 'us' | 'eu' = 'us'): PagerDutyServiceData => ({
  type: ENDPOINT_TYPES.PAGERDUTY_SERVICE,
  identifier: 'pd-endpoint-1',
  endpoint: { routingKey, region },
});

test('enqueues a trigger event with defaults on the US endpoint', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  const result = await provider.sendMessage({
    content: 'Disk usage above threshold',
    channelData: channelData('a'.repeat(32)),
  });

  expect(safeOutboundSpy).toHaveBeenCalledWith({
    url: 'https://events.pagerduty.com/v2/enqueue',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      routing_key: 'a'.repeat(32),
      event_action: 'trigger',
      payload: {
        summary: 'Disk usage above threshold',
        source: 'novu',
        severity: 'critical',
      },
    }),
  });
  expect(result.id).toBe('dedup-1');

  safeOutboundSpy.mockRestore();
});

test('uses EU endpoint when region is eu', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  await provider.sendMessage({ content: 'ping', channelData: channelData('k'.repeat(32), 'eu') });

  expect(safeOutboundSpy).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://events.eu.pagerduty.com/v2/enqueue' })
  );

  safeOutboundSpy.mockRestore();
});

test('bridge provider data overrides summary, severity, source, and passes extras as custom_details', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  await provider.sendMessage(
    { content: 'ignored content', channelData: channelData('r'.repeat(32)) },
    {
      summary: 'API down',
      severity: 'warning',
      source: 'monitor-01',
      dedup_key: 'incident-42',
      service: 'billing',
    }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body).toEqual({
    routing_key: 'r'.repeat(32),
    event_action: 'trigger',
    dedup_key: 'incident-42',
    payload: {
      summary: 'API down',
      source: 'monitor-01',
      severity: 'warning',
      custom_details: { service: 'billing' },
    },
  });

  safeOutboundSpy.mockRestore();
});

test('maps documented payload and root fields to their Events API positions', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  await provider.sendMessage(
    { content: 'ignored content', channelData: channelData('r'.repeat(32)) },
    {
      summary: 'API down',
      timestamp: '2024-01-15T10:30:00Z',
      component: 'checkout-api',
      group: 'payments',
      class: 'latency',
      client: 'novu-monitor',
      client_url: 'https://app.novu.co/alerts/1',
      links: [{ href: 'https://status.example.com', text: 'Status' }],
      images: [{ src: 'https://cdn.example.com/graph.png', alt: 'Latency graph' }],
      service: 'billing',
    }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body).toEqual({
    routing_key: 'r'.repeat(32),
    event_action: 'trigger',
    client: 'novu-monitor',
    client_url: 'https://app.novu.co/alerts/1',
    links: [{ href: 'https://status.example.com', text: 'Status' }],
    images: [{ src: 'https://cdn.example.com/graph.png', alt: 'Latency graph' }],
    payload: {
      summary: 'API down',
      source: 'novu',
      severity: 'critical',
      timestamp: '2024-01-15T10:30:00Z',
      component: 'checkout-api',
      group: 'payments',
      class: 'latency',
      custom_details: { service: 'billing' },
    },
  });

  safeOutboundSpy.mockRestore();
});

test('merges explicit custom_details with unknown bridge extras', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  await provider.sendMessage(
    { content: 'alert', channelData: channelData('m'.repeat(32)) },
    {
      custom_details: { region: 'us-east-1' },
      service: 'billing',
    }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.payload.custom_details).toEqual({
    service: 'billing',
    region: 'us-east-1',
  });

  safeOutboundSpy.mockRestore();
});

test('truncates summary to PagerDuty 1024-character limit', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());
  const longSummary = 'x'.repeat(1100);

  const provider = new PagerDutyProvider();
  await provider.sendMessage({ content: longSummary, channelData: channelData('t'.repeat(32)) });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.payload.summary).toHaveLength(1024);
  expect(body.payload.summary.endsWith('…')).toBe(true);

  safeOutboundSpy.mockRestore();
});

test('auto-generates deterministic dedup_key from transactionId+subscriberId+stepId', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  await provider.sendMessage({
    content: 'disk full',
    channelData: channelData('d'.repeat(32)),
    transactionId: 'txn-abc',
    subscriberId: 'sub-42',
    stepId: 'step-page',
  });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.dedup_key).toBe('novu:txn-abc:sub-42:step-page');

  safeOutboundSpy.mockRestore();
});

test('customData.dedup_key overrides the auto-generated key', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  await provider.sendMessage(
    {
      content: 'disk full',
      channelData: channelData('d'.repeat(32)),
      transactionId: 'txn-abc',
      subscriberId: 'sub-42',
      stepId: 'step-page',
    },
    { dedup_key: 'my-custom-key' }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.dedup_key).toBe('my-custom-key');

  safeOutboundSpy.mockRestore();
});

test('omits dedup_key entirely when neither override nor identity IDs are present', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider();
  await provider.sendMessage({ content: 'ping', channelData: channelData('n'.repeat(32)) });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body).not.toHaveProperty('dedup_key');

  safeOutboundSpy.mockRestore();
});

test('throws when channelData is missing', async () => {
  const provider = new PagerDutyProvider();

  await expect(provider.sendMessage({ content: 'hello' })).rejects.toThrow(/channelData/i);
});

test('throws when channelData is the wrong type', async () => {
  const provider = new PagerDutyProvider();

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
  ).rejects.toThrow(/pagerduty_service/i);
});

test('mapped Events API override keys stay inside the shared override inventory', () => {
  const inventory = new Set(TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.PagerDuty]);

  for (const key of PAGERDUTY_MAPPED_OVERRIDE_KEYS) {
    expect(inventory.has(key), `mapped key "${key}" missing from TOOL_PROVIDER_OVERRIDE_KEYS`).toBe(true);
  }
});
