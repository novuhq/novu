import { Stack } from '@mantine/core';
import React from 'react';
import { Button } from '../../../design-system';
import { QuickStartWrapper } from '../../../pages/quick-start/components/QuickStartWrapper';
import { successScreenSecondaryTitle, successScreenTitle } from '../../../pages/quick-start/consts';
import { InAppSandbox } from './InAppSandbox';

export function SandBoxSetupSuccess() {
  return (
    <Stack align="center">
      <InAppSandbox />
    </Stack>
  );
}
