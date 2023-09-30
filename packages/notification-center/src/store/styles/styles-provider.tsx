import React, { FunctionComponent, createContext, useMemo, useContext } from 'react';
import { CSSInterpolation } from '@emotion/css';

import type { INotificationCenterStyles, StylesPaths } from './styles-provider.types';
import { useNovuTheme } from '../../hooks';
import { getStyleByPath } from '../../utils/styles';

const StylesContext = createContext<{ styles: INotificationCenterStyles } | undefined>(undefined);

export const useStyles = (path: StylesPaths | StylesPaths[]): CSSInterpolation[] => {
  const stylesContext = useContext(StylesContext);
  const { theme, colorScheme, common } = useNovuTheme();

  if (!stylesContext) {
    throw new Error('useStyles must be used within a StylesProvider');
  }

  if (Array.isArray(path)) {
    return path.map((el) =>
      getStyleByPath({
        styles: stylesContext.styles,
        path: el,
        theme,
        common,
        colorScheme,
      })
    );
  }

  return [
    getStyleByPath({
      styles: stylesContext.styles,
      path,
      theme,
      common,
      colorScheme,
    }),
  ];
};

export const StylesProvider: FunctionComponent<{ styles?: INotificationCenterStyles }> = ({ styles, children }) => {
  const contextValue = useMemo(() => ({ styles }), [styles]);

  return <StylesContext.Provider value={contextValue}>{children}</StylesContext.Provider>;
};
