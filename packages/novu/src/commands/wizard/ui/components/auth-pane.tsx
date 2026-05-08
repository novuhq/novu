import clipboardy from 'clipboardy';
import { Box, Text, useInput } from 'ink';
import open from 'open';
import React from 'react';
import { LoadingBox } from '../primitives';
import { theme } from '../theme';
import type { WizardSession } from '../wizard-session';

const DEFAULT_AUTH_MESSAGE = 'Authorising via the Novu Dashboard…';
const ACTION_HINT_TIMEOUT_MS = 2000;

/**
 * OSC 8 hyperlink escapes. Wrapping the URL with these makes terminals that
 * support OSC 8 (iTerm2, kitty, wezterm, Warp, Ghostty, VSCode 1.72+, modern
 * gnome-terminal, etc.) treat the entire visible string — even across line
 * wraps — as a single click target pointing at the FULL URL.
 *
 * Without this, terminals fall back to auto-detecting URLs in the rendered
 * text. When Ink wraps a long URL across two lines the auto-detector only
 * picks up the first line, so Cmd+Click opens a truncated, broken link
 * (the bug this fixes).
 *
 * `wrap-ansi` (the wrapper Ink uses) re-emits the OSC 8 envelope after every
 * `\n`, so each wrapped row is clickable on its own and points to the same
 * full URL. Terminals that don't support OSC 8 ignore the escape and render
 * the URL as plain text, so we degrade gracefully.
 */
const OSC8_OPEN = (url: string): string => `\u001B]8;;${url}\u0007`;
const OSC8_CLOSE = '\u001B]8;;\u0007';

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
 *
 * Mouse-select is unreliable in alt-screen mode (most macOS terminals
 * require an Option/⌥-drag and even then long URLs are easy to clip), so:
 *   - `c` copies the URL to the clipboard via `clipboardy`
 *   - `o` re-opens the URL in the default browser via `open`
 *   - the URL itself is wrapped in an OSC 8 hyperlink so Cmd+Click on any
 *     visual line of the wrapped URL opens the full URL.
 */
export function AuthPane({ session }: AuthPaneProps): React.ReactElement {
  const message = session.auth.message ?? DEFAULT_AUTH_MESSAGE;
  const url = session.auth.dashboardLoginUrl;
  const [actionHint, setActionHint] = React.useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  useInput(
    (input) => {
      if (!url) return;
      if (input === 'c') {
        try {
          clipboardy.writeSync(url);
          setActionHint({ text: 'Copied URL to clipboard', tone: 'ok' });
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          setActionHint({ text: `Copy failed: ${reason}`, tone: 'error' });
        }

        return;
      }
      if (input === 'o') {
        // Fire-and-forget — `open` resolves once the helper process is spawned,
        // not when the browser actually shows the page. Surface the failure
        // path in the hint so the user knows to fall back to copy + paste.
        open(url).then(
          () => setActionHint({ text: 'Opened URL in your default browser', tone: 'ok' }),
          (error) => {
            const reason = error instanceof Error ? error.message : String(error);
            setActionHint({ text: `Open failed: ${reason}`, tone: 'error' });
          }
        );
      }
    },
    { isActive: !!url }
  );

  React.useEffect(() => {
    if (!actionHint) return;
    const timer = setTimeout(() => setActionHint(null), ACTION_HINT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [actionHint]);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color={theme.brand}>
        Connecting your account
      </Text>
      <LoadingBox message={message} color={theme.brand} />
      {url ? (
        <Box flexDirection="column">
          <Text dimColor>If your browser didn't open, visit:</Text>
          <Text color={theme.link}>{`${OSC8_OPEN(url)}${url}${OSC8_CLOSE}`}</Text>
          <Text dimColor>Press c to copy · o to open in browser</Text>
          {actionHint ? <Text color={actionHint.tone === 'ok' ? theme.ok : theme.error}>{actionHint.text}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}
