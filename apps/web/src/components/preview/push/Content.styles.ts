import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

export const ContentStyled = styled.div<{ isBlur: boolean }>`
  display: flex;
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  position: relative;
  overflow: hidden;
  ${({ isBlur }) => isBlur && 'filter: blur(2px)'};
`;

export const ContentWrapperStyled = styled.div`
  padding: 8px;
  margin-top: 72px;
`;

export const ContentAndOVerlayWrapperStyled = styled.div<{ isError: boolean }>`
  overflow: hidden;
  position: relative;
  border-radius: 12px;
  ${({ isError }) => isError && `border: 1px solid ${colors.error};`}
`;

export const ContentHeaderStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;
