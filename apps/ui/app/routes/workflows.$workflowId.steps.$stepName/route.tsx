import React from 'react';
import { Anchor, Group, Stack, Text } from '@mantine/core';
import { useOutletContext, useParams } from '@remix-run/react';
import { loader } from '../workflows.$workflowId/route';

export default function WorkflowStepRoute() {
  const data = useOutletContext();
  console.log({ stepData: data });

  return (
    <Group>
      <Stack>
        <Text>{data.name}</Text>
        <Text>{data.template.type}</Text>
      </Stack>
    </Group>
  );
}
