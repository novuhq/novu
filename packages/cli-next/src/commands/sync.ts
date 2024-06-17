import axios from 'axios';
import { createHmac } from 'crypto';

export async function sync(echoUrl: string, novuApiKey: string, backendUrl: string) {
  const syncResult = await executeSync(backendUrl, echoUrl, novuApiKey);

  if (syncResult.status >= 400) {
    console.error(new Error(JSON.stringify(syncResult.data)));
    process.exit(1);
  }

  return syncResult.data;
}

export async function executeSync(backendUrl: string, echoUrl: string, novuApiKey: string) {
  const url = backendUrl + '/v1/echo/sync?source=cli';

  return await axios.post(
    url,
    {
      bridgeUrl: echoUrl,
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
