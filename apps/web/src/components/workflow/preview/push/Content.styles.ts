import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

export const ContentStyled = styled.div<{ isBlur: boolean }>`
  display: flex;
  padding: 1rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  flex-shrink: 0;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  position: relative;
  overflow: hidden;
  ${({ isBlur }) => isBlur && 'filter: blur(2px)'};
`;

export const ContentWrapperStyled = styled.div`
  padding: 0.5rem;
  margin-top: 4.5rem;
`;

export const ContentAndOVerlayWrapperStyled = styled.div<{ isError: boolean }>`
  overflow: hidden;
  position: relative;
  border-radius: 0.75rem;
  ${({ isError }) => isError && `border: 1px solid ${colors.error};`}
`;

export const ContentHeaderStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;
