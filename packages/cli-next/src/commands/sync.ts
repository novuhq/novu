import axios, { AxiosResponse } from 'axios';
import { createHmac } from 'crypto';

export async function sync(echoUrl: string, novuApiKey: string, backendUrl: string) {
  const discover = await executeDiscover(echoUrl, novuApiKey);

  const syncResult = await executeSync(backendUrl, echoUrl, discover, novuApiKey);

  return syncResult.data;
}

export async function executeSync(
  backendUrl: string,
  echoUrl: string,
  discover: AxiosResponse<any>,
  novuApiKey: string
) {
  const url = backendUrl + '/v1/echo/sync?source=cli';

  return await axios.post(
    url,
    {
      bridgeUrl: echoUrl,
      workflows: discover.data.workflows,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'ApiKey ' + novuApiKey,
      } as any,
    }
  );
}

export async function executeDiscover(echoUrl: string, novuApiKey: string) {
  return await axios.get(`${echoUrl}?action=discover`, {
    headers: {
      'x-novu-signature': buildSignature(novuApiKey),
    } as any,
  });
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
