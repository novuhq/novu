import type { IconSize, IconType as OurIconType, IIconProps } from './Icon.types';

/** Override Icon types */

declare module 'react-icons' {
  export type IconType = OurIconType;

  // avoid declaration merging by using type instead of interface below
  export type IconBaseProps = IIconProps;
  export type IconContextProps = {
    color?: IconColor;
    size?: IconSize;
    className?: string;
    attr?: React.SVGAttributes<SVGElement>;
  };

  export declare const DefaultContext: IconContextProps;
  export declare const IconContext: React.Context<IconContextProps>;
}
