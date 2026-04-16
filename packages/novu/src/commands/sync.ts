import axios from 'axios';
import { createHmac } from 'crypto';

interface DiscoverResponse {
  workflows: unknown[];
  agents?: Array<{ agentId: string }>;
}

export async function sync(bridgeUrl: string, secretKey: string, apiUrl: string) {
  if (!bridgeUrl) {
    throw new Error('A bridge URL is required for the sync command, please supply it when running the command');
  }

  if (!secretKey) {
    throw new Error('A secret key is required for the sync command, please supply it when running the command');
  }

  if (!apiUrl) {
    throw new Error(
      'An API url is required for the sync command, please omit the configuration option entirely or supply a valid API url when running the command'
    );
  }
  const syncResult = await executeSync(apiUrl, bridgeUrl, secretKey);

  if (syncResult.status >= 400) {
    console.error(new Error(JSON.stringify(syncResult.data)));
    process.exit(1);
  }

  await syncAgentBridgeUrls(bridgeUrl, secretKey, apiUrl);

  return syncResult.data;
}

export async function executeSync(apiUrl: string, bridgeUrl: string, secretKey: string) {
  const url = `${apiUrl}/v1/bridge/sync?source=cli`;

  return await axios.post(
    url,
    {
      bridgeUrl,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${secretKey}`,
      },
    }
  );
}

async function syncAgentBridgeUrls(bridgeUrl: string, secretKey: string, apiUrl: string) {
  try {
    const discoverUrl = `${bridgeUrl}?action=discover`;
    const discoverRes = await axios.get<DiscoverResponse>(discoverUrl, { timeout: 5000 });
    const agents = discoverRes.data?.agents ?? [];

    if (agents.length === 0) {
      return;
    }

    console.log(`Setting production bridge URL for ${agents.length} agent(s)...`);

    const results = await Promise.allSettled(
      agents.map((agent) =>
        axios.put(
          `${apiUrl}/v1/agents/${encodeURIComponent(agent.agentId)}/bridge`,
          { bridgeUrl },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `ApiKey ${secretKey}`,
            },
          }
        )
      )
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const agentId = agents[i].agentId;
      if (result.status === 'fulfilled') {
        console.log(`  ✓ ${agentId}`);
      } else {
        console.warn(`  ✗ ${agentId}: ${result.reason?.message || 'unknown error'}`);
      }
    }
  } catch {
    console.warn('Could not discover agents for bridge URL sync (bridge may not expose agents yet).');
  }
}

export function buildSignature(secretKey: string) {
  const timestamp = Date.now();

  return `t=${timestamp},v1=${buildHmac(secretKey, timestamp)}`;
}

export function buildHmac(secretKey: string, timestamp: number) {
  return createHmac('sha256', secretKey)
    .update(`${timestamp}.${JSON.stringify({})}`)
    .digest('hex');
}
