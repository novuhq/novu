import React from 'react';
import { Grid, Timeline } from '@mantine/core';

import { OnboardingUseCase } from '../consts';

export function GetStartedTab({ onboardingUseCase }: { onboardingUseCase: OnboardingUseCase }) {
  const { steps, demo } = onboardingUseCase;

  return (
    <Grid align="stretch">
      <Grid.Col span={4}>
        <Timeline bulletSize={40} lineWidth={2}>
          {steps.map((step, index) => (
            <Timeline.Item bullet={index + 1} lineVariant={'dashed'} key={step}>
              {step}
            </Timeline.Item>
          ))}
        </Timeline>
      </Grid.Col>

      <Grid.Col span={8}>{demo} </Grid.Col>
    </Grid>
  );
}
