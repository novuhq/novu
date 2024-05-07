import axios from 'axios';
import { createHmac } from 'crypto';

export async function syncState(echoUrl: string, novuApiKey: string, backendUrl: string) {
  const timestamp = Date.now();
  const discover = await axios.get(`${echoUrl}?action=discover`, {
    headers: {
      'x-novu-signature':
        't=' +
        timestamp +
        ',v1=' +
        createHmac('sha256', novuApiKey)
          .update(timestamp + '.' + JSON.stringify({}))
          .digest('hex'),
    },
  });

  const sync = await axios.post(
    backendUrl + '/v1/echo/sync?source=cli',
    {
      chimeraUrl: echoUrl,
      workflows: discover.data.workflows,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'ApiKey ' + novuApiKey,
      },
    }
  );

  return sync.data;
}
