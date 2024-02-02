import styled from '@emotion/styled';
import 'material-symbols/outlined.css';
import { IIconAxes, IIconStyleProps, IconName } from './Icon.types';
import { DEFAULT_ICON_GRADE, DEFAULT_ICON_OPTICAL_SIZE, DEFAULT_ICON_SIZE, DEFAULT_ICON_WEIGHT } from './Icon.const';
import React from 'react';

const StyledIcon = styled.span<IIconAxes & IIconStyleProps>(
  ({ theme, isFilled, weight, grade, opticalSize, size }) => `
  font-variation-settings: 'FILL' ${isFilled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size};
  font-size: ${size}px;

  /**
   * overrides
   **/
  
  /** since Material Symbols are actually just a font, disable it being selectable like normal text */
  user-select: none;

`
);

export interface IIconProps extends IIconAxes, IIconStyleProps, React.HTMLAttributes<HTMLSpanElement> {
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
  ...spanProps
}) => {
  return (
    <StyledIcon
      isFilled={isFilled}
      grade={grade}
      weight={weight}
      opticalSize={opticalSize}
      size={size}
      className={`material-symbols-outlined ${className}`}
      /** a11y */
      role="img"
      aria-label={`icon-${name}`}
      {...spanProps}
    >
      {name}
    </StyledIcon>
  );
};
