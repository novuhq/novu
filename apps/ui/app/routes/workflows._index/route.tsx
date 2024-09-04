import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Table, Pill, Group, Anchor } from '@mantine/core';
import { api } from '@/app/hooks/api.hook';

// Adds a breadcrumb to the workflows route - https://remix.run/docs/en/main/guides/breadcrumbs
export const handle = {
  breadcrumb: () => [<Anchor href="/workflows">Workflows</Anchor>],
};

export async function loader() {
  /*
   *  TODO: fix the workflows validation error
   * const workflows = await api.workflows.list({});
   */

  const response = await fetch('https://api.novu.co/v1/notification-templates?page=0&limit=10', {
    headers: {
      authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
      'novu-environment-id': process.env.NOVU_ENVIRONMENT_ID,
    },
    body: null,
    method: 'GET',
  });

  const workflows = await response.json();

  return json({
    workflows,
  });
}

export default function WorkflowsRoute() {
  const data = useLoaderData<typeof loader>();

  const rows = data.workflows.data.map((workflow) => (
    <Table.Tr key={workflow.id}>
      <Table.Td>
        <Anchor href={`/workflows/${workflow._id}`}>{workflow.name}</Anchor>
      </Table.Td>
      <Table.Td>
        <Group gap={2}>
          {[...new Set(workflow.steps.map((step) => step.template.type))].map((type) => (
            // @ts-expect-error - Template type is not typed
            <Pill key={type}>{type}</Pill>
          ))}
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap={2}>
          {workflow.tags.map((tag) => (
            <Pill key={tag}>{tag}</Pill>
          ))}
        </Group>
      </Table.Td>
      <Table.Td>{workflow.createdAt}</Table.Td>
      <Table.Td>{workflow.updatedAt}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Channels</Table.Th>
          <Table.Th>Tags</Table.Th>
          <Table.Th>Created</Table.Th>
          <Table.Th>Updated</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
