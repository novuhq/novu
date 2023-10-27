import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Center } from '@mantine/core';
import styled from '@emotion/styled';

import { Button } from '@novu/design-system';
import { currentOnboardingStep } from './route/store';

export function NavButton({
  pulse = false,
  navigateTo,
  variant,
  handleOnClick,
  children,
  ...props
}: {
  pulse?: boolean;
  navigateTo: string;
  variant?: 'outline' | 'gradient';
  handleOnClick?: () => void;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const navigate = useNavigate();

  function handleNavigationClick() {
    if (handleOnClick) {
      handleOnClick();
    }

    currentOnboardingStep().set(navigateTo);

    if (navigateTo) {
      navigate(navigateTo);
    }
  }

  return (
    <Center data-test-id="get-started-footer-left-side" inline onClick={handleNavigationClick} {...props}>
      <StyledButton fullWidth variant={variant ?? 'outline'} pulse={pulse}>
        <>{children}</>
      </StyledButton>
    </Center>
  );
}

const StyledButton = styled(Button)`
  height: 50px;
`;
