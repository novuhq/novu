import styled from '@emotion/styled';
import { ControlButton, IControlButtonProps } from './ControlButton';
import { colors } from '../config';
import { useMantineTheme } from '@mantine/core';

// TODO: Fix `theme` type once design system is ready and then use theme values
const getFontColor = ({ theme }: { theme: any }): string => {
  // TODO: speak with Design -- this is bad, we should not be using a "BG" color for font
  return theme.colorScheme === 'dark' ? colors.white : colors.BGDark;
};

// TODO: Fix `theme` type once design system is ready and then use theme values
const getDisabledFontColor = ({ theme }: { theme: any }): string => {
  return theme.colorScheme === 'dark' ? colors.B40 : colors.B80;
};

export type IconControlButtonProps = Omit<IControlButtonProps, 'isCurrentPage'>;

const _IconControlButton = styled(ControlButton)<IconControlButtonProps>(
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

/**
 * Specialized ControlButton for "rich" nodes such as Icons or custom JSX elements.
 */
export const IconControlButton: React.FC<IconControlButtonProps> = (props) => (
  <_IconControlButton theme={useMantineTheme()} {...props} />
);
