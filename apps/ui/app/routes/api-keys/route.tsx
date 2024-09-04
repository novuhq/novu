import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Anchor } from '@mantine/core';
import { api } from '@/app/hooks/api.hook';
import { getEnvironments } from '../../hooks/api.hook';

// Adds a breadcrumb to the workflows route - https://remix.run/docs/en/main/guides/breadcrumbs
export const handle = {
  breadcrumb: () => <Anchor href="/api-keys">API Keys</Anchor>,
};

export async function loader() {
  const environments = await getEnvironments();

  return json({
    environments,
  });
}

export default function ApiKeysRoute() {
  const data = useLoaderData<typeof loader>();

  // @ts-expect-error - environments response DTO is incorrectly typed
  return data.environments.data.map((environment) => (
    <div key={environment._id}>
      <h2>{environment.name}</h2>
      <p>{environment.description}</p>
      <>
        {environment.apiKeys.map((apiKey) => (
          <div key={apiKey._id}>
            <p>Secret Key: {apiKey.key}</p>
          </div>
        ))}
      </>
      <p>Application Identifier: {environment.identifier}</p>
      <p>Environment ID: {environment._id}</p>
    </div>
  ));
}
