import { Novu } from '@novu/api';

console.log({ ENV: import.meta.env });

export const api = new Novu({
  apiKey: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
});

export const getEnvironments = async () => {
  const response = await fetch('https://api.novu.co/v1/environments', {
    headers: {
      authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
      'novu-environment-id': process.env.NOVU_ENVIRONMENT_ID,
    },
    body: null,
    method: 'GET',
  });
  const environments = (await response.json()) as Awaited<ReturnType<typeof api.environments.list>>;

  return environments;
};
