import styled from '@emotion/styled';
import 'material-symbols/outlined.css';
import { MaterialSymbol } from 'material-symbols';

export const MaterialSymbolWeightArray = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type MaterialSymbolWeight = (typeof MaterialSymbolWeightArray)[number];

interface IIconStyleProps {
  /**
   * Default `false`.
   *
   * Fill gives you the ability to modify the default icon style. A single icon can render both unfilled and filled states.
   */
  isFilled?: boolean;
  /**
   * Weight defines the symbol’s stroke weight, with a range of weights between thin (100) and heavy (900).
   * Weight can  also affect the overall size of the symbol.
   */
  weight?: MaterialSymbolWeight;
  /**
   * Weight and grade affect a symbol’s thickness. Adjustments to grade are more granular than adjustments to weight
   * and have a small impact on the size of the symbol.
   *
   */
  grade?: number;
  /**
   * Default `'inherit'`.
   *
   * Size defines the icon width and height in pixels. For the image to look the same at different sizes, the stroke
   * weight (thickness) changes as the icon size scales.
   */
  size?: number;
}

const StyledIcon = styled.span<IIconStyleProps>(
  ({ theme, isFilled, weight, grade, size }) => `
  font-variation-settings: 'FILL' ${isFilled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size};
`
);

export interface IIconProps extends IIconStyleProps {
  /**
   * The name of the Icon to use.
   * https://fonts.google.com/icons
   */
  name: MaterialSymbol;
  className?: string;
}

export const Icon: React.FC<IIconProps> = ({ className, name, isFilled, grade, weight, size }) => {
  return (
    <StyledIcon
      isFilled={isFilled}
      grade={grade}
      weight={weight}
      size={size}
      className={`material-symbols-outlined ${className}`}
    >
      {name}
    </StyledIcon>
  );
};
