import { Group } from '@mantine/core';
import React from 'react';
import { PlanFootnotes } from './PlanFootnote';

export const PlanFooter = () => {
  return (
    <Group
      spacing={0}
      style={{
        padding: '16px 24px',
        marginBottom: '40px',
      }}
    >
      <PlanFootnotes />
    </Group>
  );
};
