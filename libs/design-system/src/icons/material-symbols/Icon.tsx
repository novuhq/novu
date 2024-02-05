import styled from '@emotion/styled';
import { IIconAxes, IIconStyleProps } from './Icon.types';
import { DEFAULT_ICON_GRADE, DEFAULT_ICON_OPTICAL_SIZE, DEFAULT_ICON_SIZE, DEFAULT_ICON_WEIGHT } from './Icon.const';
import React from 'react';
import { colors } from '../../config';
import IconName from './IconName.types';

// cspell:disable-next-line
import '@fontsource-variable/material-symbols-outlined/full.css';

const StyledIcon = styled.span<IIconAxes & IIconStyleProps>(
  ({ theme, isFilled, weight, grade, opticalSize, size, unsafeColor: color }) => `
  /** Material Axes */

  /** cspell:disable-next-line */
  font-variation-settings: 'FILL' ${isFilled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize};

  font-size: ${size}px;
  text-align: center;
  text-align-vertical: middle;

  /** TODO: use real theme values once released */
  color: ${color ?? (theme.colorScheme === 'dark' ? colors.B60 : colors.B60)};

  /**
   * overrides
   **/
  
  /** since Material Symbols are actually just a font, disable it being selectable like normal text */
  user-select: none;

  /** Base styling for font -- adapted from https://fontsource.org/docs/getting-started/material-symbols */
  font-family: 'Material Symbols Outlined Variable', sans-serif;
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "liga";
`
);

export interface IIconProps
  extends IIconAxes,
    IIconStyleProps,
    Omit<React.HTMLAttributes<HTMLSpanElement>, 'color' | 'dangerouslySetInnerHtml'> {
  /**
   * The name of the Icon to use.
   * https://fonts.google.com/icons
   */
  name: IconName;
  className?: string;
}

export const Icon: React.FC<IIconProps> = ({
  className,
  name,
  // axes
  isFilled = false,
  grade = DEFAULT_ICON_GRADE,
  weight = DEFAULT_ICON_WEIGHT,
  opticalSize = DEFAULT_ICON_OPTICAL_SIZE,

  // styles
  size = DEFAULT_ICON_SIZE,

  /**
   * NOTE: this is only to be used with colors from the design system, and will later be enforced more strictly
   */
  unsafeColor,
  ...spanProps
}) => {
  return (
    <StyledIcon
      /** axes  */
      isFilled={isFilled}
      grade={grade}
      weight={weight}
      opticalSize={opticalSize}
      /** styles */
      size={size}
      unsafeColor={unsafeColor}
      className={`material-symbols-outlined${className ? ` ${className}` : ''}`}
      /** a11y */
      role="img"
      aria-label={`icon-${name}`}
      {...spanProps}
    >
      {name}
    </StyledIcon>
  );
};
