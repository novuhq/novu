import styled from 'styled-components';
import { colors } from '../constants/colors';

export const Text = styled.span`
  min-width: 160px;
  padding: 0.4rem 0.6rem;
  color: ${colors.dark};
  line-height: 1.3;
  border: 1px solid ${colors.medium};
  border-radius: 3px;
`;
