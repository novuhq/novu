import { MaterialSymbol } from 'material-symbols';

export const IconWeightArray = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type IconWeight = (typeof IconWeightArray)[number];

export type IconGrade = number;
export type IconOpticalSize = number;

export type IconName = MaterialSymbol;

export interface IIconAxes {
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
  weight?: IconWeight;
  /**
   * Weight and grade affect a symbol’s thickness. Adjustments to grade are more granular than adjustments to weight
   * and have a small impact on the size of the symbol.
   *
   */
  grade?: IconGrade;
  /**
   * Default `'inherit'`.
   *
   * Size defines the icon width and height in pixels. For the image to look the same at different sizes, the stroke
   * weight (thickness) changes as the icon size scales.
   */
  opticalSize?: IconOpticalSize;
}

/** Size in px */
export type IconSize = '16' | '20' | '24';

export interface IIconStyleProps {
  size?: IconSize;
}
