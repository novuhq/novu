import axios from 'axios';
import { createHmac } from 'crypto';

export async function sync(bridgeUrl: string, novuApiKey: string, novuCloudApiUrl: string) {
  const syncResult = await executeSync(novuCloudApiUrl, bridgeUrl, novuApiKey);

  if (syncResult.status >= 400) {
    console.error(new Error(JSON.stringify(syncResult.data)));
    process.exit(1);
  }

  return syncResult.data;
}

export async function executeSync(novuCloudApiUrl: string, bridgeUrl: string, novuApiKey: string) {
  const url = novuCloudApiUrl + '/v1/bridge/sync?source=cli';

  return await axios.post(
    url,
    {
      bridgeUrl,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'ApiKey ' + novuApiKey,
      } as any,
    }
  );
}

export function buildSignature(novuApiKey: string) {
  const timestamp = Date.now();

  return `t=${timestamp},v1=${buildHmac(novuApiKey, timestamp)}`;
}

export function buildHmac(novuApiKey: string, timestamp: number) {
  return createHmac('sha256', novuApiKey)
    .update(timestamp + '.' + JSON.stringify({}))
    .digest('hex');
}
