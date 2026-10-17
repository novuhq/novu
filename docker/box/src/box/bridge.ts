
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import { dirname } from 'node:path';
import * as z from 'zod';
import { fetchJson } from '../node/http.ts';
import { log } from '../node/main.ts';
import {
  ApiCreated,
  ApiEnvironment,
  ApiEnvironments,
  ApiIntegrations,
  ApiSynced,
  BridgeDiscovery,
} from '../shared/contracts.ts';
import { api, apiHas } from './api.ts';
import { BRIDGE_SECRET, BRIDGE_URL, MANAGED_AGENT } from './paths.ts';
import { waitForHttp } from './runtime.ts';
import { pc } from './supervisor.ts';

export async function seedBridge(token: string): Promise<void> {
  const { data } = await api('/v1/environments', ApiEnvironments, { headers: { Authorization: `Bearer ${token}` } });
  const key = data.find((environment) => environment.name === 'Development')?.apiKeys[0]?.key;
  if (!key) throw new Error('the seed org has no Development environment');
  fs.mkdirSync(dirname(BRIDGE_SECRET), { recursive: true });
  fs.writeFileSync(BRIDGE_SECRET, key, { mode: 0o600 });
  await syncBridge();
}

function bridgeKey(): string {
  return fs.readFileSync(BRIDGE_SECRET, 'utf8').trim();
}

export async function syncBridge(): Promise<void> {
  const headers = { Authorization: `ApiKey ${bridgeKey()}` };
  const { agents } = await discoverBridge();
  const synced = await api('/v1/bridge/sync?source=box', ApiSynced, {
    method: 'POST',
    headers,
    json: { bridgeUrl: BRIDGE_URL },
  });
  for (const { agentId } of agents) {
    if (!(await apiHas(`/v1/agents/${agentId}`, headers))) {
      await api('/v1/agents', z.unknown(), { method: 'POST', headers, json: { name: agentId, identifier: agentId } });
      await api(`/v1/agents/${agentId}/integrations`, z.unknown(), {
        method: 'POST',
        headers,
        json: { providerId: 'novu-web-chat' },
      });
      log(`agent ${agentId} is on web chat`);
    }
    await api(`/v1/agents/${agentId}/bridge`, z.unknown(), { method: 'PUT', headers, json: { bridgeUrl: BRIDGE_URL } });
  }
  log(`bridge synced: ${synced.data.length} workflows and ${agents.length} agents from ${BRIDGE_URL}`);
}

async function discoverBridge() {
  await waitForHttp(`${BRIDGE_URL}?action=health-check`, 120);
  const timestamp = Date.now();
  const signature = createHmac('sha256', bridgeKey()).update(`${timestamp}.{}`).digest('hex');

  return fetchJson(`${BRIDGE_URL}?action=discover`, BridgeDiscovery, {
    headers: { 'novu-signature': `t=${timestamp},v1=${signature}` },
  });
}

export async function seedManagedAgent(): Promise<void> {
  await pc(['process', 'start', 'thalamus']);
  await waitForHttp('http://127.0.0.1:8788/health', 120);
  const headers = { Authorization: `ApiKey ${bridgeKey()}` };
  if (await apiHas(`/v1/agents/${MANAGED_AGENT}`, headers)) return;
  const environment = (await api('/v1/environments/me', ApiEnvironment, { headers })).data;
  const integrations = (await api('/v1/integrations', ApiIntegrations, { headers })).data;
  const existing = integrations.find(
    (item) => item.providerId === 'novu-anthropic' && item._environmentId === environment._id
  );
  const integrationId =
    existing?._id ??
    (
      await api('/v1/integrations', ApiCreated, {
        method: 'POST',
        headers,
        json: { providerId: 'novu-anthropic', kind: 'agent', name: 'Novu Managed Claude', active: true, check: false },
      })
    ).data._id;
  await api('/v1/agents', z.unknown(), {
    method: 'POST',
    headers,
    json: {
      name: 'Box managed agent',
      identifier: MANAGED_AGENT,
      runtime: 'managed',
      managedRuntime: {
        providerId: 'novu-anthropic',
        integrationId,
        model: 'claude-haiku-4-5',
        systemPrompt: 'You are the Novu Box test agent. Keep answers to one short sentence.',
        tools: ['bash'],
      },
    },
  });
  await api(`/v1/agents/${MANAGED_AGENT}/integrations`, z.unknown(), {
    method: 'POST',
    headers,
    json: { providerId: 'novu-web-chat' },
  });
  log(`managed agent ${MANAGED_AGENT} is on web chat`);
}
