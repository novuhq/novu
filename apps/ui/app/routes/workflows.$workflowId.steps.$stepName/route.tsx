import React from 'react';
import { Anchor, Button, Group, Stack, Tabs, Text, Title } from '@mantine/core';
import { useOutletContext, useParams } from '@remix-run/react';
import { loader } from '../workflows.$workflowId/route';

export default function WorkflowStepRoute() {
  const data = useOutletContext();
  console.log({ stepData: data });

  return (
    <Stack h="600" bg="pink" p="md">
      <Group justify="space-between">
        <Title order={3}>{data.name}</Title>
        <Group>
          <Button>Delete</Button>
        </Group>
      </Group>
      <Group justify="space-between" grow>
        <Stack align="center">
          <Text>{data.name}</Text>
          <Text>{data.template.type}</Text>
        </Stack>
        <Tabs defaultValue="controls">
          <Tabs.List>
            <Tabs.Tab value="controls">Controls</Tabs.Tab>
            <Tabs.Tab value="payload">Payload</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="controls">TODO: Add controls component</Tabs.Panel>

          <Tabs.Panel value="payload">TODO: Add payload component</Tabs.Panel>
        </Tabs>
      </Group>
    </Stack>
  );
}
