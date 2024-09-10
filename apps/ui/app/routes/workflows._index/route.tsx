import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { Table, Pill, Group, Anchor, Stack, Text, Box, Title, Button } from '@mantine/core';
import { IconOutlineOfflineBolt, IconMoreHoriz, IconAdd } from '@novu/novui/icons';
import { api } from '@/hooks/api.hook';
import { StepIcon } from '@/components/icons/step-icon';

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
    <Table.Tr key={workflow._id}>
      <Table.Td>
        <Anchor component={Link} to={`/workflows/${workflow._id}`}>
          <Group gap="sm">
            <Box c="success">
              <IconOutlineOfflineBolt style={{ height: 20, width: 20 }} />
            </Box>
            <Stack gap="xs">
              <Text truncate="end">{workflow.name}</Text>
              <Text size="xs" c="secondary">
                {workflow.name}
              </Text>
            </Stack>
          </Group>
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Group gap="sm">
          {[...new Set(workflow.steps.map((step) => step.template.type))].map((type) => (
            // @ts-expect-error - Template type is not typed
            <StepIcon key={type} type={type} />
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
      <Table.Td>{new Date(workflow.updatedAt).toLocaleDateString()}</Table.Td>
      <Table.Td>
        <IconMoreHoriz />
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between">
        <Title order={1}>Workflows</Title>
        <Button leftSection={<IconAdd style={{ height: 16, width: 16 }} />}>Create</Button>
      </Group>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Channels</Table.Th>
            <Table.Th>Tags</Table.Th>
            <Table.Th>Updated</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </>
  );
}
