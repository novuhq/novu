import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, useMantineTheme } from '@mantine/core';

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
      {!appInitialized ? (
        <Loader color={colorScheme === 'dark' ? colors.BGLight : colors.B60} size={50} />
      ) : (
        <Center>
          <Button variant="outline" onClick={() => navigateToTestTrigger()}>
            All set! Click to continue
          </Button>
        </Center>
      )}
    </>
  );
}
