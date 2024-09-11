import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Tabs,
  TagsInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData, useParams } from '@remix-run/react';
import { useState } from 'react';
import {
  IconOutlineSchema,
  IconChecklist,
  IconSettings,
  IconOutlineMoreHoriz,
  IconOutlineSave,
  IconOutlinePlayCircle,
  IconOutlineOfflineBolt,
  IconOutlineBolt,
  IconOutlineAdd,
} from '@novu/novui/icons';
import { api } from '@/hooks/api.hook';
import { StepIcon } from '@/components/icons/step-icon';

// Adds a breadcrumb to the workflows route - https://remix.run/docs/en/main/guides/breadcrumbs
export const handle = {
  breadcrumb: (match) => {
    const step = match.data.workflow.data.steps.find((step) => step.name === match.params.stepName);

    return [
      <Anchor href="/workflows">Workflows</Anchor>,
      <Anchor href={`/workflows/${match.data.workflow.data.id}`}>{match.data.workflow.data.name}</Anchor>,
      match.params.stepName ? (
        <Anchor href={`/workflows/${match.data.workflow.data.id}/steps/${step.name}`}>{step.name}</Anchor>
      ) : null,
    ];
  },
};

export async function loader({ params }: LoaderFunctionArgs) {
  /*
   *  TODO: fix the workflows validation error
   *  const workflow = await api.workflows.retrieve(params.id);
   */
  const response = await fetch(`https://api.novu.co/v1/notification-templates/${params.workflowId}`, {
    headers: {
      authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
      'novu-environment-id': process.env.NOVU_ENVIRONMENT_ID,
    },
    body: null,
    method: 'GET',
  });

  const workflow = (await response.json()) as Awaited<ReturnType<typeof api.workflows.retrieve>>;

  return json({
    workflow,
  });
}

const WorkflowStep = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  return (
    <Link to={to}>
      <Paper bg="popover" p="md" w="200px" c="primary">
        <Group>
          {icon}
          <Text>{label}</Text>
        </Group>
      </Paper>
    </Link>
  );
};

export default function WorkflowRoute() {
  const data = useLoaderData<typeof loader>();
  const params = useParams();
  const step = data.workflow.data.steps.find((step) => step.name === params.stepName);
  const [tab, setTab] = useState<'steps' | 'logs' | 'settings'>('steps');

  return (
    <Stack p="sm">
      <Group justify="space-between" mx="-1.5rem" mt="-1rem" px="md" pb="sm" style={{ borderBottom: '1px solid #000' }}>
        <Flex gap="sm" align="center">
          <Box c="success" mt="xs">
            <IconOutlineOfflineBolt style={{ height: 20, width: 20 }} />
          </Box>
          <Title order={2}>{data.workflow.data.name}</Title>
        </Flex>
        <SegmentedControl
          value={tab}
          withItemsBorders={false}
          radius="xs"
          onChange={(value) => setTab(value as 'steps' | 'logs' | 'settings')}
          data={[
            {
              label: (
                <Flex dir="row" gap="sm" align="center">
                  <IconOutlineSchema />
                  <Text>Steps</Text>
                </Flex>
              ),
              value: 'steps',
            },
            {
              label: (
                <Flex dir="row" gap="sm" align="center">
                  <IconChecklist />
                  <Text>Logs</Text>
                </Flex>
              ),
              value: 'logs',
            },
            {
              label: (
                <Flex dir="row" gap="sm" align="center">
                  <IconSettings />
                  <Text>Settings</Text>
                </Flex>
              ),
              value: 'settings',
            },
          ]}
        />
        <Group gap="sm">
          <Button leftSection={<IconOutlineSave />}>Save</Button>
          <Button leftSection={<IconOutlinePlayCircle />}>Test</Button>
          <ActionIcon variant={'transparent'}>
            <IconOutlineMoreHoriz style={{ height: 20, width: 20 }} />
          </ActionIcon>
        </Group>
      </Group>
      <Group justify="space-between">
        <Stack align="center" justify="center">
          <WorkflowStep
            to={`/workflows/${data.workflow.data.id}`}
            icon={<IconOutlineBolt style={{ height: 24, width: 24 }} />}
            label="Trigger"
          />
          {/* @ts-expect-error - need to figure out how to type this */}
          {data.workflow.data.steps.map((step) => (
            <WorkflowStep
              key={step.id}
              to={`/workflows/${data.workflow.data.id}/steps/${step.name}`}
              icon={<StepIcon type={step.template.type} style={{ height: 24, width: 24 }} />}
              label={step.template.name}
            />
          ))}
          <ActionIcon bg="segmentedControl">
            <IconOutlineAdd style={{ height: 20, width: 20 }} />
          </ActionIcon>
        </Stack>
        {step && <Outlet context={{ step, workflowId: data.workflow.data.id }} />}
        {!step && (
          <Tabs defaultValue="general">
            <Tabs.List>
              <Tabs.Tab value="general">General</Tabs.Tab>
              <Tabs.Tab value="preferences">Preferences</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="general">
              <Stack>
                <TextInput label="Identifier" value={data.workflow.data.name} readOnly />
                <TextInput label="Name" value={data.workflow.data.name} readOnly />
                <TextInput label="Description" value={data.workflow.data.description} readOnly />
                <TagsInput label="Tags" value={data.workflow.data.tags} />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="preferences">
              <Stack>Determine which default channel values subscribers can modify in their application</Stack>
              TODO: Add preferences component
            </Tabs.Panel>
          </Tabs>
        )}
      </Group>
    </Stack>
  );
}
