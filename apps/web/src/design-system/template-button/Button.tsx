import styled from '@emotion/styled';
import { UnstyledButton } from '@mantine/core';

export function Button(props) {
  return <WrapperButton {...props} />;
}

export const WrapperButton: any = styled(UnstyledButton)`
  position: relative;

  @media screen and (max-width: 1400px) {
    padding: 0 5px;
  }
`;
