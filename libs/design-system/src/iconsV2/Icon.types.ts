import { CSSProperties, SVGAttributes } from 'react';

/** Icon Size in pixels (to be replaced with values directly from Design System) */
export type IconSize = '16' | '20' | '24';

/** A temporary type that accepts a typical CSS color until we have our strict Design System types defined */
type UnsafeIconColor = CSSProperties['color'];

export interface IIconStyleProps {
  /**
   * Default: '20px'.
   *
   * The actual display size in pixels.
   */
  size?: IconSize;
  /**
   * Default: B60
   *
   * WARNING: this is only to be used with colors from the design system, and will later be enforced more strictly
   */
  color?: UnsafeIconColor;
}

export interface IIconProps extends Omit<SVGAttributes<SVGElement>, 'color'>, IIconStyleProps {
  /** Description for accessibility. This is mandatory so that we make a11y a priority with icons */
  title: string;
}
export type IconType = (props: IIconProps) => JSX.Element;
