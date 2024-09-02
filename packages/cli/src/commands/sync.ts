import axios from 'axios';
import { createHmac } from 'crypto';

export async function sync(bridgeUrl: string, secretKey: string, apiUrl: string) {
  if (!bridgeUrl) {
    throw new Error('A bridge URL is required for the sync command, please supply it when running the command');
  }

  if (!secretKey) {
    throw new Error('A secret key is required for the sync command, please supply it when running the command');
  }

  if (!apiUrl) {
    throw new Error(
      // eslint-disable-next-line max-len
      'An API url is required for the sync command, please omit the configuration option entirely or supply a valid API url when running the command'
    );
  }
  const syncResult = await executeSync(apiUrl, bridgeUrl, secretKey);

  if (syncResult.status >= 400) {
    console.error(new Error(JSON.stringify(syncResult.data)));
    process.exit(1);
  }

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

export function buildSignature(secretKey: string) {
  const timestamp = Date.now();

  return `t=${timestamp},v1=${buildHmac(secretKey, timestamp)}`;
}

export function buildHmac(secretKey: string, timestamp: number) {
  return createHmac('sha256', secretKey)
    .update(`${timestamp}.${JSON.stringify({})}`)
    .digest('hex');
}
