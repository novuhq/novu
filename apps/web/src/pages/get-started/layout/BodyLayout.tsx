import React, { ReactNode } from 'react';
import { Grid } from '@mantine/core';

export function BodyLayout({ children }: { children: ReactNode[] }) {
  const [left, right] = children;

  return (
    <Grid align="stretch">
      <Grid.Col span={4} style={{ background: 'darkblue' }}>
        {left}
      </Grid.Col>

      <Grid.Col span={8} style={{ background: 'pink' }}>
        {right}
      </Grid.Col>
    </Grid>
  );
}
