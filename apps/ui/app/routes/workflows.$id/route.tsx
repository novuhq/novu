import { Anchor } from '@mantine/core';
import { json, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { api } from '@/app/hooks/api.hook';

// Adds a breadcrumb to the workflows route - https://remix.run/docs/en/main/guides/breadcrumbs
export const handle = {
  breadcrumb: (match) => {
    return [
      <Anchor href="/workflows">Workflows</Anchor>,
      <Anchor href={`/workflows/${match.data.workflow.data.id}`}>{match.data.workflow.data.name}</Anchor>,
    ];
  },
};

export async function loader({ params }: LoaderFunctionArgs) {
  /*
   *  TODO: fix the workflows validation error
   *  const workflow = await api.workflows.retrieve(params.id);
   */
  const response = await fetch(`https://api.novu.co/v1/notification-templates/${params.id}`, {
    headers: {
      authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
      'novu-environment-id': process.env.NOVU_ENVIRONMENT_ID,
    },
    body: null,
    method: 'GET',
  });

  const workflow = (await response.json()) as Awaited<ReturnType<typeof api.workflows.get>>;

  return json({
    workflow,
  });
}

export default function WorkflowRoute() {
  const data = useLoaderData<typeof loader>();

  return <div>{JSON.stringify(data)}</div>;
}
