import styled from '@emotion/styled';
import { colors, DotsNavigation } from '@novu/design-system';

export const TooltipContainer = styled.div<{
  width: React.CSSProperties['width'];
}>`
  display: flex;
  flex-direction: column;
  width: ${({ width }) => width};
  padding: 24px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B98)};
  filter: drop-shadow(0px 5px 20px rgba(0, 0, 0, 0.1));
  border-radius: 8px;
`;

export const DotsNavigationStyled = styled(DotsNavigation)`
  display: flex;
  align-self: center;
`;

export const NavigationItemContainer = styled.div<{ position: React.CSSProperties['justifyContent'] }>`
  display: flex;
  flex-basis: 33%;
  align-items: center;
  justify-content: ${({ position }) => position};
`;

export const IntroStepContainer = styled(TooltipContainer)`
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 100;
`;
