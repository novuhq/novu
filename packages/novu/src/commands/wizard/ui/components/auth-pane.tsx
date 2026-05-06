import { Box, Text } from 'ink';
import React from 'react';
import { LoadingBox } from '../primitives';
import { theme } from '../theme';
import type { WizardSession } from '../wizard-session';

const DEFAULT_AUTH_MESSAGE = 'Authorising via the Novu Dashboard…';

export type AuthPaneProps = {
  session: WizardSession;
};

/**
 * Right-pane content shown while the wizard is in `RunPhase.Auth`. Renders
 * the spinner, a hint, and the dashboard URL on its OWN static line — the
 * URL is intentionally NOT mixed into the spinner message so spinner ticks
 * don't redraw it. Combined with Ink's `incrementalRendering: true`, this
 * keeps the URL line untouched between renders so the user's mouse selection
 * survives the entire auth wait.
 */
export function AuthPane({ session }: AuthPaneProps): React.ReactElement {
  const message = session.auth.message ?? DEFAULT_AUTH_MESSAGE;
  const url = session.auth.dashboardLoginUrl;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={theme.brand}>
        Connecting your account
      </Text>
      <LoadingBox message={message} color={theme.brand} />
      {url ? (
        <Box flexDirection="column">
          <Text dimColor>If your browser didn't open, visit:</Text>
          <Text color={theme.link}>{url}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
