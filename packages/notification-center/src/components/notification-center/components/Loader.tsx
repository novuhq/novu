import { Loader as MantineLoader } from '@mantine/core';
import chroma from 'chroma-js';
import { getLinearGradientColorStopValues } from '../../../shared/utils/getLinearGradientColorStopValues';
import React from 'react';
import { useNovuThemeProvider } from '../../../hooks/use-novu-theme-provider.hook';

export const Loader = ({ color }: { color?: string }) => {
  const { theme } = useNovuThemeProvider();
  const loaderColor = color || theme.loaderColor;

  return (
    <div
      style={{
        textAlign: 'center',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MantineLoader
        color={
          loaderColor.indexOf('gradient') === -1
            ? loaderColor
            : chroma.average(getLinearGradientColorStopValues(loaderColor))
        }
      />
    </div>
  );
};
