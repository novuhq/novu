import { createStyles } from '@mantine/core';
import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

export const useStyles = createStyles((theme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    dropdown: {
      margin: 0,
      padding: 15,
      backgroundColor: dark ? colors.B20 : colors.white,
      color: dark ? colors.white : colors.B40,
      border: 'none',
      borderRadius: '7px',
    },
    arrow: {
      backgroundColor: dark ? colors.B20 : colors.white,
      border: 'none',
    },
  };
});

export const AvatarWrapper = styled.div<{ dark: boolean; readonly: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${({ dark }) => (dark ? colors.B40 : colors.B80)};
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: 'pointer';
  overflow: hidden;
  user-select: none;

  ${({ readonly }) => {
    if (readonly) {
      return `pointer-events: none`;
    }
  }}
`;

export const IconWrapper = styled.div<{ containerBgColor: string; iconColor: string; size: number }>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  border-radius: 50%;
  cursor: pointer;
  background-color: ${({ containerBgColor }) => containerBgColor};
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
  color: ${({ iconColor }) => iconColor};
`;
