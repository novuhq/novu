import styled from '@emotion/styled';

import { Input } from '@novu/design-system';

export const StyledInput = styled(Input)`
  width: 18.75rem;

  .mantine-TextInput-wrapper,
  input {
    min-height: auto;
    height: 2.625rem;
  }
  margin-top: -2px;
`;

export const StyledButton = styled.button`
  color: #0000ff;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
`;
