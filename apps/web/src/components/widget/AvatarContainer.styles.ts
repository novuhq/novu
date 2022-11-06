import { createStyles } from '@mantine/core';
import styled from '@emotion/styled';
import { colors } from '../../design-system';

export const useStyles = createStyles((theme) => {
  const dark = theme.colorScheme === 'dark';

  return {
    inner: { margin: 0, padding: 15 },
    target: { height: '40px' },
    arrow: {
      backgroundColor: dark ? colors.B20 : colors.white,
      height: '-22px',
      border: 'none',
      margin: '0px',
    },
    body: {
      backgroundColor: dark ? colors.B20 : colors.white,
      color: dark ? colors.white : colors.B40,
      border: 'none',
      marginTop: '1px',
      width: '100%',
    },
    popover: { width: '240px' },
  };
});

export const AvatarWrapper = styled.div<{ dark: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${({ dark }) => (dark ? colors.B40 : colors.B80)};
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  overflow: hidden;
  user-select: none;
`;

export const IconWrapper = styled.div<{ bgColor: string; size: number }>`
  width: ${({ size }) => size}px;
  height: ${({ size }) => size}px;
  border-radius: 50%;
  cursor: pointer;
  background-color: ${({ bgColor }) => `${bgColor}26`};
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
  color: ${({ bgColor }) => bgColor};
`;
