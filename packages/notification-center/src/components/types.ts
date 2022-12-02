import { CSSInterpolation } from '@emotion/css';

import { ColorScheme } from '../shared/config/colors';
import { ICommonTheme } from '../store/novu-theme-provider.context';
import { INovuTheme } from '../store/novu-theme.context';

export type CSSFunctionOrObject =
  | ((theme: INovuTheme, common: ICommonTheme, colorScheme: ColorScheme) => CSSInterpolation)
  | CSSInterpolation;

export type ObjectWithRoot<T = {}> = T & {
  root: CSSFunctionOrObject;
};
