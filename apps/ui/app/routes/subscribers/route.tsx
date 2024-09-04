import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Anchor, Table } from '@mantine/core';
import { api } from '@/app/hooks/api.hook';

// Adds a breadcrumb to the workflows route - https://remix.run/docs/en/main/guides/breadcrumbs
export const handle = {
  breadcrumb: () => <Anchor href="/subscribers">Subscribers</Anchor>,
};

export async function loader() {
  const subscribers = await api.subscribers.list();

  return json({
    subscribers,
  });
}

export default function SubscribersRoute() {
  const data = useLoaderData<typeof loader>();

  const rows = data.subscribers.result.data.map((subscriber) => (
    <Table.Tr key={subscriber.id}>
      <Table.Td>{subscriber.id}</Table.Td>
      <Table.Td>{subscriber.firstName}</Table.Td>
      <Table.Td>{subscriber.lastName}</Table.Td>
      <Table.Td>{subscriber.email}</Table.Td>
      <Table.Td>{subscriber.phone}</Table.Td>
      <Table.Td>{subscriber.createdAt}</Table.Td>
      <Table.Td>{subscriber.updatedAt}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>ID</Table.Th>
          <Table.Th>First Name</Table.Th>
          <Table.Th>Last Name</Table.Th>
          <Table.Th>Email</Table.Th>
          <Table.Th>Phone</Table.Th>
          <Table.Th>Created</Table.Th>
          <Table.Th>Updated</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
