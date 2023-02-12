import { Center, Loader } from '@mantine/core';
import { Button, colors } from '../../../design-system';
import { CheckCircle } from '../../../design-system/icons';
import React from 'react';
import { useNavigate } from 'react-router-dom';

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
        <Loader color={colors.B70} size={32} variant={'dots'} />
      ) : (
        <Center>
          <CheckCircle color={colors.success} />
          <Button variant="outline" onClick={() => navigateToTestTrigger()}>
            Click to continue
          </Button>
        </Center>
      )}
    </>
  );
}
