import { Loader as MantineLoader } from '@mantine/core';
import { useTheme } from 'styled-components';
import chroma from 'chroma-js';
import { getLinearGradientColorStopValues } from '../shared/utils/getLinearGradientColorStopValues';

export const Loader = ({ color }: { color?: string }) => {
  const theme: any = useTheme();
  const loaderColor = color || theme.colors.main;

  return (
    <div
      style={{
        textAlign: 'center',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
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
