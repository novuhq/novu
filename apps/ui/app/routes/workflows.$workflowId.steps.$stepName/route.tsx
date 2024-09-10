import { ActionIcon, Group, Stack, Tabs, Text, Title } from '@mantine/core';
import { Link, useOutletContext } from '@remix-run/react';
// TODO: fix icon exports in Novui
import { IconArrowForwardIos, IconOutlineDeleteOutline } from '@novu/novui/icons';
import { StepIcon } from '../../components/icons/step-icon';

export default function WorkflowStepRoute() {
  const data = useOutletContext();
  console.log({ stepData: data });

  return (
    <Stack h="calc(100vh - 148px)" p="md">
      <Group justify="space-between">
        <Group>
          <Link to={`/workflows/${data.workflowId}`}>
            <ActionIcon>
              <IconArrowForwardIos />
            </ActionIcon>
          </Link>
          <StepIcon type={data.step.template.type} />
          <Title order={3}>{data.step.name}</Title>
        </Group>
        <Group>
          <ActionIcon>
            <IconOutlineDeleteOutline />
          </ActionIcon>
        </Group>
      </Group>
      <Group justify="space-between" grow>
        <Stack align="center">
          <Text>{data.step.name}</Text>
          <Text>{data.step.template.type}</Text>
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
