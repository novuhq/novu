import React from 'react';
import styled from '@emotion/styled';
import { UnstyledButton, UnstyledButtonProps } from '@mantine/core';

export const Button = React.forwardRef<HTMLButtonElement, UnstyledButtonProps>((props, ref) => {
  return <WrapperButton ref={ref} {...props} />;
});

export const WrapperButton: any = styled(UnstyledButton)`
  position: relative;

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;
