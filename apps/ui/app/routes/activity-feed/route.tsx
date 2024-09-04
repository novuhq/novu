import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Table } from '@mantine/core';
import { api } from '@/app/hooks/api.hook';

export async function loader() {
  /*
   * TODO: fix the notifications validation error
   * const notifications = await api.notifications.list({
   *   page: 1,
   *   channels: [],
   *   templates: [],
   *   emails: [],
   *   search: '',
   *   subscriberIds: [],
   * });
   */
  const response = await fetch('https://api.novu.co/v1/notifications?page=0', {
    headers: {
      authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
      'novu-environment-id': process.env.NOVU_ENVIRONMENT_ID,
    },
    body: null,
    method: 'GET',
  });

  const notifications = await response.json();

  return json({
    notifications,
  });
}

export default function ActivityFeedRoute() {
  const data = useLoaderData<typeof loader>();

  const rows = data.notifications.data.map((notification) => (
    <Table.Tr key={notification.id}>
      <Table.Td>{notification.name ?? 'Stateless'}</Table.Td>
      <Table.Td>{notification.createdAt}</Table.Td>
      <Table.Td>{notification.subscriber.subscriberId}</Table.Td>
      <Table.Td>{notification.transactionId}</Table.Td>
      <Table.Td>{notification.jobs.map((job) => job.type).join(', ')}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Date</Table.Th>
          <Table.Th>SubscriberId</Table.Th>
          <Table.Th>TransactionId</Table.Th>
          <Table.Th>Jobs</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
