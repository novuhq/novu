import { Anchor, Button, Group, Stack, Tabs, TagsInput, Text, TextInput, Title } from '@mantine/core';
import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData, useParams } from '@remix-run/react';
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

export default function WorkflowRoute() {
  const data = useLoaderData<typeof loader>();
  const params = useParams();
  const step = data.workflow.data.steps.find((step) => step.name === params.stepName);

  return (
    <Stack p="sm">
      <Group justify="space-between">
        <Title order={2}>{data.workflow.data.name}</Title>
        <Group>
          <Button>Save</Button>
          <Button>Test</Button>
          <Button>…</Button>
        </Group>
      </Group>
      <Group justify="space-between" grow>
        <Stack align="center">
          {/* @ts-expect-error - need to figure out how to type this */}
          {data.workflow.data.steps.map((step) => (
            <Link key={step.id} to={`/workflows/${data.workflow.data.id}/steps/${step.name}`}>
              <Group bg="popover" p="md" w="200px">
                <StepIcon type={step.template.type} />
                <Text>{step.template.name}</Text>
              </Group>
            </Link>
          ))}
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
