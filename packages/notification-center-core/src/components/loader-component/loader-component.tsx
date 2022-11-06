import { FunctionalComponent, h } from '@stencil/core';
import chroma from 'chroma-js';

import { getTheme } from '../../theme';
import { getLinearGradientColorStopValues } from '../../utils/colors';

export const LoaderComponent: FunctionalComponent<{ color?: string }> = ({ color }) => {
  const theme = getTheme();
  const baseColor = color || theme.loaderColor;
  const loaderColor =
    theme.loaderColor.indexOf('gradient') === -1
      ? baseColor
      : chroma.average(getLinearGradientColorStopValues(baseColor)).hex();

  return (
    <div
      style={{
        textAlign: 'center',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <loading-icon width="18px" height="18px" stroke={loaderColor} />
    </div>
  );
};
