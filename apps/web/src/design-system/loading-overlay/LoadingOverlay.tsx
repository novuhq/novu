import { LoadingOverlayProps, LoadingOverlay as MantineLoadingOverlay, useMantineTheme } from '@mantine/core';
import React from 'react';
import { colors } from '../config';

interface ILoadingOverlayProps extends JSX.ElementChildrenAttribute {
  visible: boolean;
  minLayoutHeight?: number;
}

export function LoadingOverlay({ children, minLayoutHeight = 500, visible }: ILoadingOverlayProps) {
  const theme = useMantineTheme();
  const defaultDesign = {
    overlayColor: theme.colorScheme === 'dark' ? colors.B30 : colors.B98,
    loaderProps: { color: colors.error },
  } as LoadingOverlayProps;

  return (
    <div style={{ position: 'relative', minHeight: minLayoutHeight }}>
      <MantineLoadingOverlay {...defaultDesign} visible={visible} />
      {children}
    </div>
  );
}
