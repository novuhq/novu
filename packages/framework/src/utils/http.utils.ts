import { UnknownError } from '../errors';

export const initApiClient = (apiKey: string, baseURL = 'https://api.novu.co') => {
  const apiUrl = process.env.NOVU_API_URL || baseURL;

  return {
    post: async <T = any>(route: string, data: Record<string, unknown>): Promise<T> => {
      const response = await fetch(apiUrl + '/v1' + route, {
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
      } else {
        throw new UnknownError(resJson.statusCode, resJson.error, resJson.message);
      }
    },
    delete: async <T = any>(route: string): Promise<T> => {
      return (
        await fetch(apiUrl + '/v1' + route, {
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
