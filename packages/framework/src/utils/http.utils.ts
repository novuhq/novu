export const initApiClient = (apiKey: string, baseURL = 'https://api.novu.co/v1') => {
  return {
    post: async (route: string, data: Record<string, unknown>) => {
      return await fetch(baseURL + route, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${apiKey}`,
        },
        body: JSON.stringify(data),
      });
    },
  };
};
