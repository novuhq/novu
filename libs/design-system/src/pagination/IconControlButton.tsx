import styled from '@emotion/styled';
import { ControlButton, IControlButtonProps } from './ControlButton';
import { colors } from '../config';

// TODO: Fix `theme` type once design system is ready and then use theme values
const getFontColor = ({ theme }: { theme: any }): string => {
  return theme.colorScheme !== 'light' ? colors.white : 'black';
};

// TODO: Fix `theme` type once design system is ready and then use theme values
const getDisabledFontColor = ({ theme }: { theme: any }): string => {
  return theme.colorScheme !== 'light' ? colors.B40 : colors.B80;
};

export type IconControlButtonProps = Omit<IControlButtonProps, 'isCurrentPage'>;

/**
 * Specialized ControlButton for "rich" nodes such as Icons or custom JSX elements.
 */
export const IconControlButton = styled(ControlButton)<IconControlButtonProps>(
  ({ theme }) => `
  color: ${getFontColor({ theme })};
  /* SVG / icon overrides */
  path {
    fill: ${getFontColor({ theme })};
  }

  &:disabled {
    color: ${getDisabledFontColor({ theme })};
    /* SVG / icon overrides */
    path {
      fill: ${getDisabledFontColor({ theme })};
    }
  }
`
);
