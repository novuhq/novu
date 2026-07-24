import clipboardy from 'clipboardy';
import { Box, Text, useInput } from 'ink';
import open from 'open';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';

const ACTION_HINT_TIMEOUT_MS = 2000;

/**
 * OSC 8 hyperlink escapes. Terminals that support OSC 8 treat the wrapped
 * visible string as one click target for the full URL (see wizard auth-pane).
 */
const OSC8_OPEN = (url: string): string => `\u001B]8;;${url}\u0007`;
const OSC8_CLOSE = '\u001B]8;;\u0007';

export type CopyableLinkProps = {
  url: string;
  hint?: string;
  color?: string;
};

/**
 * Renders a URL on its own stable line with OSC 8 linking and keyboard shortcuts.
 * Pair with Ink `incrementalRendering: true` so orb animation does not redraw this line.
 */
export function CopyableLink({ url, hint, color = 'cyan' }: CopyableLinkProps): React.ReactElement {
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
        open(url).then(
          () => setActionHint({ text: 'Opened URL in your default browser', tone: 'ok' }),
          (error) => {
            const reason = error instanceof Error ? error.message : String(error);
            setActionHint({ text: `Open failed: ${reason}`, tone: 'error' });
          }
        );
      }
    },
    { isActive: Boolean(url) }
  );

  React.useEffect(() => {
    if (!actionHint) return;
    const timer = setTimeout(() => setActionHint(null), ACTION_HINT_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [actionHint]);

  return (
    <Box flexDirection="column">
      {hint ? <Text dimColor>{hint}</Text> : null}
      <Text color={color}>{`${OSC8_OPEN(url)}${url}${OSC8_CLOSE}`}</Text>
      <Text dimColor>Press c to copy · o to open in browser</Text>
      {actionHint ? <Text color={actionHint.tone === 'ok' ? 'green' : 'red'}>{actionHint.text}</Text> : null}
    </Box>
  );
}
