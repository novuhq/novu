import styled from 'styled-components';
import { colors } from '../constants/colors';
import { Button, ButtonProps } from './Button';

export const SecondaryButton = styled(Button)<ButtonProps>`
  background-color: ${colors.tertiary};
`;
