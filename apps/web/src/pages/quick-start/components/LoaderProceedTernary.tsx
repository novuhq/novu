import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, useMantineTheme } from '@mantine/core';

import { Button, colors } from '../../../design-system';

export function LoaderProceedTernary({
  appInitialized,
  navigatePath,
}: {
  appInitialized: boolean;
  navigatePath: string;
}) {
  const navigate = useNavigate();
  const { colorScheme } = useMantineTheme();

  function navigateToTestTrigger() {
    navigate(navigatePath);
  }

  return (
    <>
      <Button variant="outline" onClick={() => navigateToTestTrigger()} disabled={!appInitialized}>
        Continue
      </Button>
      {!appInitialized && (
        <Loader
          style={{ marginLeft: 15 }}
          color={colorScheme === 'dark' ? colors.BGLight : colors.B60}
          variant={'dots'}
          size={40}
        />
      )}
    </>
  );
}
