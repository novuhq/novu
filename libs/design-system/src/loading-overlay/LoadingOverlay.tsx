import { LoadingOverlayProps, LoadingOverlay as MantineLoadingOverlay, useMantineTheme } from '@mantine/core';
import { PropsWithChildren } from 'react';
import { colors } from '../config';

interface ILoadingOverlayProps {
  visible: boolean;
  minLayoutHeight?: number;
}

export function LoadingOverlay({ children, minLayoutHeight = 500, visible }: PropsWithChildren<ILoadingOverlayProps>) {
  const theme = useMantineTheme();
  const defaultDesign = {
    overlayColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B98,
    loaderProps: { color: colors.error },
  } as LoadingOverlayProps;

  return <div style={{ position: 'relative', minHeight: minLayoutHeight }}>{children}</div>;
}
