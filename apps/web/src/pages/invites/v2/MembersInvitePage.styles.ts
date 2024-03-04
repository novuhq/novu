import styled from '@emotion/styled';

import { Input } from '@novu/design-system';

export const StyledInput = styled(Input)`
  width: 300px;

  .mantine-TextInput-wrapper,
  input {
    min-height: auto;
    height: 42px;
  }
  position: relative;
  top: -2px;
`;

export const StyledButton = styled.button`
  color: #0000ff;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
`;
