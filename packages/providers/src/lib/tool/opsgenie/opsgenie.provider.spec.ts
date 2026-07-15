import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { expect, test, vi } from 'vitest';
import { OpsgenieToolProvider } from './opsgenie-tool.provider';

const mockResponse = (requestId = 'req-1') => ({
  statusCode: 202,
  statusMessage: 'Accepted',
  headers: {},
  body: { requestId, result: 'Request will be processed' },
});

test('creates an alert on the US endpoint with GenieKey auth and required message', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieToolProvider({
    apiKey: 'og-test-key',
    region: 'us',
  });

  const result = await provider.sendMessage({ content: 'Payment service is down' });

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

  const provider = new OpsgenieToolProvider({
    apiKey: 'og-eu',
    region: 'eu',
  });

  await provider.sendMessage({ content: 'ping' });

  expect(safeOutboundSpy).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://api.eu.opsgenie.com/v2/alerts' })
  );

  safeOutboundSpy.mockRestore();
});

test('truncates message to Opsgenie 130-character limit and passes optional fields', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());
  const longMessage = 'x'.repeat(200);

  const provider = new OpsgenieToolProvider({
    apiKey: 'og-long',
    region: 'us',
  });

  await provider.sendMessage(
    { content: longMessage },
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

test('folds unknown bridge extras into details', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new OpsgenieToolProvider({
    apiKey: 'og-extras',
    region: 'us',
  });

  await provider.sendMessage(
    { content: 'alert' },
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
