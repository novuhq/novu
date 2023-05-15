import { Stack } from '@mantine/core';
import { InAppSandbox } from './InAppSandbox';

export function SandBoxSetupSuccess() {
  return (
    <Stack align="center">
      <InAppSandbox showOverlay={true} />
    </Stack>
  );
}
