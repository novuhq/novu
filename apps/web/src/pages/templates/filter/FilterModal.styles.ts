import styled from '@emotion/styled';
import { Button, colors } from '../../../design-system';

export const FilterButton = styled(Button)`
  margin-top: 0px;
`;

export const DeleteStepButton = styled(Button)`
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
  :hover {
    background: rgba(229, 69, 69, 0.15);
  }
  margin-top: 0px;
`;
