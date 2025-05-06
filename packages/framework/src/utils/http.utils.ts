import { checkIsResponseError } from '../shared';
import { BridgeError, MissingSecretKeyError, PlatformError } from '../errors';

export const initApiClient = (secretKey: string, apiUrl: string) => {
  if (!secretKey) {
    throw new MissingSecretKeyError();
  }

  return {
    post: async <T = unknown>(route: string, data: Record<string, unknown>): Promise<T> => {
      const response = await fetch(`${apiUrl}/v1${route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${secretKey}`,
        },
        body: JSON.stringify(data),
      });

      const resJson = await response.json();

      if (response.ok) {
        return resJson as T;
      } else if (checkIsResponseError(resJson)) {
        throw new PlatformError(resJson.statusCode, resJson.error, resJson.message);
      } else {
        throw new BridgeError(resJson);
      }
    },
    delete: async <T = unknown>(route: string): Promise<T> => {
      return (
        await fetch(`${apiUrl}/v1${route}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${secretKey}`,
          },
        })
      ).json() as T;
    },
  };
};
