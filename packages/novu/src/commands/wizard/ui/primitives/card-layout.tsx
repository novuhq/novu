import { Box } from 'ink';
import React from 'react';

export type CardLayoutProps = {
  children: React.ReactNode;
  paddingX?: number;
  paddingY?: number;
  marginTop?: number;
  marginBottom?: number;
  borderColor?: string;
  bordered?: boolean;
  align?: 'flex-start' | 'center' | 'flex-end';
};

/**
 * Lightweight container that aligns / pads its children consistently. Used by
 * Bootstrap, Mcp and Outro screens to keep the visual rhythm uniform.
 */
export function CardLayout({
  children,
  paddingX = 1,
  paddingY = 0,
  marginTop = 0,
  marginBottom = 0,
  borderColor,
  bordered = false,
  align = 'flex-start',
}: CardLayoutProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      paddingX={paddingX}
      paddingY={paddingY}
      marginTop={marginTop}
      marginBottom={marginBottom}
      alignItems={align}
      borderStyle={bordered ? 'round' : undefined}
      borderColor={borderColor}
    >
      {children}
    </Box>
  );
}
