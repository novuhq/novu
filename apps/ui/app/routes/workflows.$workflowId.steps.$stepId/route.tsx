import React from 'react';
import { Anchor, Text } from '@mantine/core';
import { useOutletContext, useParams } from '@remix-run/react';
import { loader } from '../workflows.$workflowId/route';

export default function WorkflowStepRoute() {
  const data = useOutletContext();
  console.log({ stepData: data });

  return <Text>{data.name}</Text>;
}
