import { checkIsResponseError } from '@novu/shared';
import { BridgeError, PlatformError } from '../errors';

export const initApiClient = (apiKey: string, baseURL = 'https://api.novu.co') => {
  const apiUrl = process.env.NOVU_API_URL || baseURL;

  return {
    post: async <T = unknown>(route: string, data: Record<string, unknown>): Promise<T> => {
      const response = await fetch(`${apiUrl}/v1${route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${apiKey}`,
        },
        body: JSON.stringify(data),
      });

      const resJson = await response.json();

      if (response.ok) {
        return resJson as T;
      } else if (checkIsResponseError(resJson)) {
        throw new PlatformError(resJson.statusCode, resJson.error, resJson.message);
      } else {
        throw new BridgeError('Error processing API request to Novu Cloud from Bridge application.');
      }
    },
    delete: async <T = unknown>(route: string): Promise<T> => {
      return (
        await fetch(`${apiUrl}/v1${route}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${apiKey}`,
          },
        })
      ).json() as T;
    },
  };
};
