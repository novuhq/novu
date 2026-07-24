import { Box, Text } from 'ink';
import React from 'react';
import type { WizardServices } from '../services';

export function ExitScreen(_props: { services: WizardServices }): React.ReactElement {
  return (
    <Box paddingX={1}>
      <Text dimColor>Cleaning up…</Text>
    </Box>
  );
}
