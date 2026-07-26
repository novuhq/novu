import { TOOL_PROVIDER_OVERRIDE_KEYS, ToolProviderIdEnum } from '@novu/shared';
import * as safeOutboundHttp from '@novu/shared/utils/safe-outbound-http';
import { ENDPOINT_TYPES, GrafanaOnCallIntegrationData } from '@novu/stateless';
import { expect, test, vi } from 'vitest';
import { GrafanaProvider } from './grafana.provider';

/** Keys the provider maps onto the Formatted Webhook — must stay ⊆ the shared override inventory. */
const GRAFANA_MAPPED_OVERRIDE_KEYS = [
  'message',
  'title',
  'alert_uid',
  'state',
  'link_to_upstream_details',
  'image_url',
] as const;

const WEBHOOK_URL = 'https://acme.grafana.net/integrations/v1/formatted_webhook/m12xmIjOcgwH74UF8CN4dk0Dh/';

const mockResponse = () => ({
  statusCode: 200,
  statusMessage: 'OK',
  headers: {},
  body: {},
});

const channelData = (url: string = WEBHOOK_URL, authToken?: string): GrafanaOnCallIntegrationData => ({
  type: ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION,
  identifier: 'grafana-endpoint-1',
  endpoint: { url, ...(authToken ? { authToken } : {}) },
});

test('posts an alerting event with defaults to the endpoint webhook URL', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  const result = await provider.sendMessage({
    content: 'Disk usage above threshold',
    channelData: channelData(),
    transactionId: 'txn-1',
    subscriberId: 'sub-1',
    stepId: 'step-1',
  });

  expect(safeOutboundSpy).toHaveBeenCalledWith({
    url: WEBHOOK_URL,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Disk usage above threshold',
      message: 'Disk usage above threshold',
      state: 'alerting',
      alert_uid: 'novu:txn-1:sub-1:step-1',
    }),
  });
  expect(result.id).toBe('novu:txn-1:sub-1:step-1');

  safeOutboundSpy.mockRestore();
});

test('sends a bearer Authorization header when the endpoint has an authToken', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  await provider.sendMessage({ content: 'ping', channelData: channelData(WEBHOOK_URL, 'glsa_secret123') });

  expect(safeOutboundSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer glsa_secret123',
      },
    })
  );

  safeOutboundSpy.mockRestore();
});

test('bridge provider data overrides mapped fields and passes extras top-level', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  await provider.sendMessage(
    { content: 'ignored content', channelData: channelData() },
    {
      title: 'API down',
      message: 'Latency above SLO',
      state: 'ok',
      alert_uid: 'incident-42',
      link_to_upstream_details: 'https://status.example.com',
      image_url: 'https://cdn.example.com/graph.png',
      service: 'billing',
    }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body).toEqual({
    service: 'billing',
    title: 'API down',
    message: 'Latency above SLO',
    state: 'ok',
    alert_uid: 'incident-42',
    link_to_upstream_details: 'https://status.example.com',
    image_url: 'https://cdn.example.com/graph.png',
  });

  safeOutboundSpy.mockRestore();
});

test('falls back to alerting when the state override is not a supported value', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  await provider.sendMessage({ content: 'ping', channelData: channelData() }, { state: 'resolved' });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.state).toBe('alerting');

  safeOutboundSpy.mockRestore();
});

test('truncates title to the defensive 1024-character cap', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());
  const longContent = 'x'.repeat(1100);

  const provider = new GrafanaProvider();
  await provider.sendMessage({ content: longContent, channelData: channelData() });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.title).toHaveLength(1024);
  expect(body.title.endsWith('…')).toBe(true);
  // The message field is not truncated.
  expect(body.message).toHaveLength(1100);

  safeOutboundSpy.mockRestore();
});

test('auto-generates deterministic alert_uid from transactionId+subscriberId+stepId', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  await provider.sendMessage({
    content: 'disk full',
    channelData: channelData(),
    transactionId: 'txn-abc',
    subscriberId: 'sub-42',
    stepId: 'step-page',
  });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.alert_uid).toBe('novu:txn-abc:sub-42:step-page');

  safeOutboundSpy.mockRestore();
});

test('customData.alert_uid overrides the auto-generated key', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  await provider.sendMessage(
    {
      content: 'disk full',
      channelData: channelData(),
      transactionId: 'txn-abc',
      subscriberId: 'sub-42',
      stepId: 'step-page',
    },
    { alert_uid: 'my-custom-uid' }
  );

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body.alert_uid).toBe('my-custom-uid');

  safeOutboundSpy.mockRestore();
});

test('omits alert_uid entirely when neither override nor identity IDs are present', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  await provider.sendMessage({ content: 'ping', channelData: channelData() });

  const call = safeOutboundSpy.mock.calls[0][0];
  const body = JSON.parse(call.body as string);
  expect(body).not.toHaveProperty('alert_uid');

  safeOutboundSpy.mockRestore();
});

test('blocks unsafe webhook URLs before any request is made', async () => {
  const safeOutboundSpy = vi.spyOn(safeOutboundHttp, 'safeOutboundJsonRequest').mockResolvedValue(mockResponse());

  const provider = new GrafanaProvider();
  await expect(
    provider.sendMessage({
      content: 'ping',
      channelData: channelData('https://localhost/integrations/v1/formatted_webhook/abc/'),
    })
  ).rejects.toThrow(/blocked/i);
  expect(safeOutboundSpy).not.toHaveBeenCalled();

  safeOutboundSpy.mockRestore();
});

test('throws when the response status is not 2xx', async () => {
  const safeOutboundSpy = vi
    .spyOn(safeOutboundHttp, 'safeOutboundJsonRequest')
    .mockResolvedValue({ statusCode: 403, statusMessage: 'Forbidden', headers: {}, body: {} });

  const provider = new GrafanaProvider();
  await expect(provider.sendMessage({ content: 'ping', channelData: channelData() })).rejects.toThrow(
    /failed with status 403/
  );

  safeOutboundSpy.mockRestore();
});

test('throws when channelData is missing', async () => {
  const provider = new GrafanaProvider();

  await expect(provider.sendMessage({ content: 'hello' })).rejects.toThrow(/channelData/i);
});

test('throws when channelData is the wrong type', async () => {
  const provider = new GrafanaProvider();

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
  ).rejects.toThrow(/grafana_oncall_integration/i);
});

test('mapped Formatted Webhook override keys stay inside the shared override inventory', () => {
  const inventory = new Set(TOOL_PROVIDER_OVERRIDE_KEYS[ToolProviderIdEnum.Grafana]);

  for (const key of GRAFANA_MAPPED_OVERRIDE_KEYS) {
    expect(inventory.has(key), `mapped key "${key}" missing from TOOL_PROVIDER_OVERRIDE_KEYS`).toBe(true);
  }
});
