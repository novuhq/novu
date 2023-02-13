import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';

import { Button, colors } from '../../../design-system';

export function LoaderProceedTernary({
  appInitialized,
  navigatePath,
}: {
  appInitialized: boolean;
  navigatePath: string;
}) {
  const navigate = useNavigate();

  function navigateToTestTrigger() {
    navigate(navigatePath);
  }

  return (
    <>
      {!appInitialized ? (
        <Loader color={colors.B70} size={32} />
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
