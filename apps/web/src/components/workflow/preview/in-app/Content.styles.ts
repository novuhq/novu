import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';
import { colors, shadows } from '@novu/design-system';

export const ContentStyled = styled.div<{ isBlur: boolean; isExampleNotification?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.5rem;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  ${({ isBlur }) => isBlur && 'filter: blur(2px)'};
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.white)};

  ${({ isExampleNotification }) => {
    if (isExampleNotification) {
      return `
      border-radius: 8px;
      opacity: 0.4;
      background: ${({ theme }) =>
        theme.colorScheme === 'dark'
          ? `linear-gradient(90deg, rgba(35, 35, 43, 0.40) 0%, rgba(36, 36, 45, 0.40) 48.44%, rgba(41, 41, 52, 0.40) 100%), ${colors.B20}`
          : colors.white};
      box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
      `;
    }
  }}
`;

export const ContentAndOverlayWrapperStyled = styled.div<{ isError: boolean }>`
  overflow: hidden;
  border-radius: 0.5rem;
  ${({ isError }) => isError && `border: 1px solid ${colors.error};`}
  position: relative;
  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};

  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 0.5rem;
    border-radius: 7px 0 0 7px;
    background: ${colors.vertical};
    z-index: 2;
  }
`;

export const NotificationTextStyled = styled.div<{ isExampleNotification: boolean }>`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.BGDark)};
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
  margin: 0;

  ${({ isExampleNotification }) => {
    if (isExampleNotification) {
      return `
      opacity: 0.4;
      color: ${colors.B60};
      font-weight: 700;
      `;
    }
  }}
`;

export const TimeTextStyled = styled(NotificationTextStyled)`
  color: ${colors.B40};
  ${({ isExampleNotification }) => {
    if (isExampleNotification) {
      return `
      opacity: 0.4;
      `;
    }
  }}
`;

const LIGHT_THEME_SKELETON_BG = colors.BGLight;
const DARK_THEME_SKELETON_BG = 'rgba(255, 255, 255, 0.04)';

export const SkeletonStyled = styled(Skeleton)`
  &::before {
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? DARK_THEME_SKELETON_BG : LIGHT_THEME_SKELETON_BG)};
  }

  &::after {
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? DARK_THEME_SKELETON_BG : LIGHT_THEME_SKELETON_BG)};
  }
`;
