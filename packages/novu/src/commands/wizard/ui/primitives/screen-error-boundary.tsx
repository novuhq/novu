import { Box, Text } from 'ink';
import React from 'react';
import { theme } from '../theme';

export type ScreenErrorBoundaryProps = {
  /**
   * Called once with the rendered Error when a descendant render throws.
   * Hosts use this to flip the session into an error outro instead of a
   * white screen of death (per ink-tui-wizard rule #8).
   */
  onError?: (error: Error) => void;
  children: React.ReactNode;
};

type ScreenErrorBoundaryState = {
  error: Error | null;
};

export class ScreenErrorBoundary extends React.Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ScreenErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));
    if (this.props.onError) this.props.onError(err);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <Box flexDirection="column" paddingX={1}>
          <Text color={theme.error} bold>
            Wizard screen crashed
          </Text>
          <Text>{this.state.error.message}</Text>
          <Text dimColor>Press Ctrl+C to exit.</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}
