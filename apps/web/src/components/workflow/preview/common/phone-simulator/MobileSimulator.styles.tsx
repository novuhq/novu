import styled from '@emotion/styled';
import { colors, shadows } from '@novu/design-system';
import { TimeIcon } from '../icons';

const BORDER_RADIUS_PX = 40;
const LIGHT_THEME_BACKGROUND = 'rgba(255, 255, 255, 0.4)';
const DARK_THEME_BACKGROUND = 'rgba(0, 0, 0, 0.6)';

export const MobileSimulatorBody = styled.div<{ withBackground: boolean; isIOS: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0 3.5rem;
  width: 27.5rem;
  height: 55rem;
  min-height: 55rem;
  border-radius: ${BORDER_RADIUS_PX}px;
  border: 1.5rem solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.BGLight)};
  box-shadow: ${shadows.dark};
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? '#4b4b51' : colors.white)};

  ${({ withBackground, isIOS, theme }) => {
    if (withBackground) {
      return `
      background-position: center;
      background-repeat: no-repeat;
      background: linear-gradient(0deg, ${
        theme.colorScheme === 'dark' ? DARK_THEME_BACKGROUND : LIGHT_THEME_BACKGROUND
      } 0%, ${theme.colorScheme === 'dark' ? DARK_THEME_BACKGROUND : LIGHT_THEME_BACKGROUND} 100%),
        url(/static/images/mobilePreview/${isIOS ? 'iphone' : 'android'}.webp) no-repeat center
          center / cover,
        lightgray;
    `;
    }
  }}
`;

export const Notch = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 10rem;
  height: 1.25rem;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.BGLight)};
  border-radius: 0 0 20px 20px;
`;

export const Camera = styled.div`
  position: absolute;
  top: 1.125rem;
  left: 1.125rem;
  width: 1.75rem;
  height: 1.75rem;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : '#cccccc')};
  border-radius: 50%;
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0.25rem;
    height: 0.25rem;
    background: ${colors.white};
    opacity: 0.5;
    border-radius: 50%;
  }
`;

export const IndicatorsContainer = styled.div`
  margin: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : '#cccccc')};
`;

export const SwitchContainer = styled.div`
  display: flex;
  justify-content: center;
  z-index: 2;
`;

export const TimeIconStyled = styled(({ isVisible }: { isVisible: boolean }) => (
  <TimeIcon style={{ opacity: isVisible ? 1 : 0 }} />
))``;
