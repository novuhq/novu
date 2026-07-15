import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect, test, vi } from 'vitest';
import { PagerDutyProvider } from './pagerduty.provider';

const mockResponse = (dedupKey = 'dedup-1') => ({
  statusCode: 202,
  statusMessage: 'Accepted',
  headers: {},
  body: { dedup_key: dedupKey, status: 'success', message: 'Event processed' },
});

test('enqueues a trigger event with defaults on the US endpoint', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider({
    routingKey: 'a'.repeat(32),
    region: 'us',
  });

  const result = await provider.sendMessage({
    content: 'Disk usage above threshold',
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

  const provider = new PagerDutyProvider({
    routingKey: 'k'.repeat(32),
    region: 'eu',
  });

  await provider.sendMessage({ content: 'ping' });

  expect(safeOutboundSpy).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://events.eu.pagerduty.com/v2/enqueue' })
  );

  safeOutboundSpy.mockRestore();
});

test('bridge provider data overrides summary, severity, source, and passes extras as custom_details', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider({
    routingKey: 'r'.repeat(32),
    region: 'us',
  });

  await provider.sendMessage(
    { content: 'ignored content' },
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

test('merges explicit custom_details with unknown bridge extras', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new PagerDutyProvider({
    routingKey: 'm'.repeat(32),
    region: 'us',
  });

  await provider.sendMessage(
    { content: 'alert' },
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

  const provider = new PagerDutyProvider({
    routingKey: 't'.repeat(32),
    region: 'us',
  });

  await provider.sendMessage({ content: longSummary });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.payload.summary).toHaveLength(1024);
  expect(body.payload.summary.endsWith('…')).toBe(true);

  safeOutboundSpy.mockRestore();
});
