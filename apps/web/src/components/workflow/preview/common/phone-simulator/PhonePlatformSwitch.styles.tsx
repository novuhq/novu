import { CSSProperties } from 'react';
import styled from '@emotion/styled';
import { colors, shadows, AppleIcon, AndroidIcon } from '@novu/design-system';

const SWITCH_CONTAINER_PADDING = 0.3125;
const THUMB_WIDTH = 3;
const THUMB_HEIGHT = 1.75;

export const AppleIconStyled = styled(({ size }: { size: CSSProperties['width'] }) => (
  <AppleIcon style={{ minWidth: size, width: size, height: size }} />
))``;

export const AndroidIconStyled = styled(({ size }: { size: CSSProperties['width'] }) => (
  <AndroidIcon style={{ minWidth: size, width: size, height: size }} />
))``;

export const SwitchContainer = styled.div`
  position: relative;
  width: 7.5rem;
  height: 2.5rem;
  padding: ${SWITCH_CONTAINER_PADDING}rem;
  border-radius: 1.875rem;
  border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B70)};
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.white)};
`;

export const SwitchInput = styled.input`
  height: 0;
  opacity: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 0;
`;

export const ButtonsContainer = styled.label`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  gap: 0.3125rem;
  cursor: pointer;
`;

export const Thumb = styled.div<{ isIOS?: boolean }>`
  position: absolute;
  left: ${({ isIOS }) =>
    isIOS ? `${SWITCH_CONTAINER_PADDING}rem` : `calc(100% - ${THUMB_WIDTH}rem - ${SWITCH_CONTAINER_PADDING}rem)`};
  z-index: 0;
  width: ${THUMB_WIDTH}rem;
  height: ${THUMB_HEIGHT}rem;
  border-radius: 1.875rem;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.BGLight)};
  box-shadow: ${shadows.dark};
  transition: left 0.3s ease;
`;

export const IconHolder = styled.span<{ isSelected: boolean }>`
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${THUMB_WIDTH}rem;
  height: ${THUMB_HEIGHT}rem;
  transition: color 0.3s ease;
  color: ${({ theme, isSelected }) =>
    theme.colorScheme === 'dark' ? colors.white : isSelected ? colors.B20 : colors.B60};
`;
