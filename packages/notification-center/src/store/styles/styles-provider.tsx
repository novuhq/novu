import React, { FunctionComponent, createContext, useMemo, useContext } from 'react';
import { CSSInterpolation } from '@emotion/css';
import get from 'lodash.get';

import { NotificationCenterStyles, StylesPaths } from './styles-provider.types';
import { CSSFunctionOrObject } from '../../components/types';
import { useNovuTheme } from '../../hooks';

const StylesContext = createContext<{ styles: NotificationCenterStyles } | undefined>(undefined);

export const useStyles = (path: StylesPaths | StylesPaths[]): CSSInterpolation[] => {
  const stylesContext = useContext(StylesContext);
  const { theme, colorScheme, common } = useNovuTheme();

  if (!stylesContext) {
    throw new Error('useStyles must be used within a StylesProvider');
  }

  const getStyleByPath = (pathInStyles: StylesPaths): CSSInterpolation => {
    const stylePart: CSSFunctionOrObject = get(stylesContext.styles, pathInStyles);

    return typeof stylePart === 'function' ? stylePart({ theme, common, colorScheme }) : stylePart;
  };

  if (Array.isArray(path)) {
    return path.map((el) => getStyleByPath(el));
  }

  return [getStyleByPath(path)];
};

export const StylesProvider: FunctionComponent<{ styles?: NotificationCenterStyles }> = ({ styles, children }) => {
  const contextValue = useMemo(() => ({ styles }), [styles]);

  return <StylesContext.Provider value={contextValue}>{children}</StylesContext.Provider>;
};
