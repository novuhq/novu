import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Anchor, Table } from '@mantine/core';
import { api, getEnvironments } from '@/hooks/api.hook';

// Adds a breadcrumb to the workflows route - https://remix.run/docs/en/main/guides/breadcrumbs
export const handle = {
  breadcrumb: () => [<Anchor href="/integrations">Integrations</Anchor>],
};

export async function loader() {
  const environments = await getEnvironments();
  /*
   * TODO: fix the integrations validation error
   * const integrations = await api.integrations.list();
   */
  const response = await fetch('https://api.novu.co/v1/integrations', {
    headers: {
      authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
      'novu-environment-id': process.env.NOVU_ENVIRONMENT_ID,
    },
    body: null,
    method: 'GET',
  });

  const integrations = (await response.json()) as Awaited<ReturnType<typeof api.integrations.list>>;

  return json({
    integrations,
    environments,
  });
}

export default function IntegrationsRoute() {
  const data = useLoaderData<typeof loader>();
  const environmentNameFromId = Object.fromEntries(
    // @ts-expect-error - environments response DTO is incorrectly typed
    data.environments.data.map((environment) => [environment._id, environment.name])
  );

  // @ts-expect-error - Integrations response DTO is incorrectly typed
  const rows = data.integrations.data.map((integration) => (
    <Table.Tr key={integration._id}>
      <Table.Td>{integration.name}</Table.Td>
      <Table.Td>{integration.name}</Table.Td>
      <Table.Td>{integration.channel}</Table.Td>
      <Table.Td>{environmentNameFromId[integration._environmentId]}</Table.Td>
      <Table.Td>{integration.conditions.map((condition) => condition.type).join(', ')}</Table.Td>
      <Table.Td>{integration.active ? 'Active' : 'Inactive'}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Provider</Table.Th>
          <Table.Th>Channel</Table.Th>
          <Table.Th>Environment</Table.Th>
          <Table.Th>Condition</Table.Th>
          <Table.Th>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
