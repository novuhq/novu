import clipboardy from 'clipboardy';
import { Box, Text, useInput, useStdout } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import React from 'react';
import { applyScrollAction, type ScrollAction, useScrollKeys } from '../hooks/use-scroll-keys';
import { glyphs, theme } from '../theme';
import type { SessionError } from '../types';

interface ErrorsOverlayProps {
  errors: SessionError[];
  width: number;
  height: number;
  onDismiss: () => void;
}

export function ErrorsOverlay({ errors, width, height, onDismiss }: ErrorsOverlayProps): React.ReactElement {
  const scrollRef = React.useRef<ScrollViewRef>(null);
  const { stdout } = useStdout();
  const [copyHint, setCopyHint] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handler = () => {
      scrollRef.current?.remeasure();
    };
    stdout?.on('resize', handler);

    return () => {
      stdout?.off('resize', handler);
    };
  }, [stdout]);

  React.useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToTop(), 0);

    return () => clearTimeout(id);
  }, []);

  const scroll = React.useCallback((action: ScrollAction) => {
    applyScrollAction(scrollRef.current, action);
  }, []);
  useScrollKeys(scroll, { mode: 'overlay' });

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onDismiss();

      return;
    }
    if (input === 'c') {
      try {
        clipboardy.writeSync(formatErrorsForClipboard(errors));
        setCopyHint('copied all errors to clipboard');
      } catch (error) {
        setCopyHint(`copy failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  React.useEffect(() => {
    if (!copyHint) return;
    const timer = setTimeout(() => setCopyHint(null), 2000);

    return () => clearTimeout(timer);
  }, [copyHint]);

  const innerWidth = Math.max(40, width - 4);
  const headerRows = 1;
  const footerRows = copyHint ? 2 : 1;
  const scrollHeight = Math.max(3, height - headerRows - footerRows - 4);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      borderColor={theme.error}
      paddingX={1}
    >
      <Box justifyContent="space-between" width={innerWidth}>
        <Text bold color={theme.error}>
          {glyphs.error} session errors ({errors.length})
        </Text>
        <Text dimColor>esc close · ↑↓/wheel scroll · PgUp/PgDn page · g/G top/bottom · c copy</Text>
      </Box>

      {errors.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>no errors recorded yet</Text>
        </Box>
      ) : (
        <Box flexDirection="column" height={scrollHeight} marginTop={1} flexShrink={1} minHeight={0} overflow="hidden">
          <ScrollView ref={scrollRef} flexDirection="column" width={innerWidth}>
            {errors.map((error, idx) => (
              <ErrorBlock
                key={error.id}
                error={error}
                index={idx + 1}
                total={errors.length}
                width={innerWidth}
                isLast={idx === errors.length - 1}
              />
            ))}
          </ScrollView>
        </Box>
      )}

      <Box marginTop={1}>{copyHint ? <Text color={theme.ok}>{copyHint}</Text> : <Text dimColor> </Text>}</Box>
    </Box>
  );
}

interface ErrorBlockProps {
  error: SessionError;
  index: number;
  total: number;
  width: number;
  isLast: boolean;
}

function ErrorBlock({ error, index, total, width, isLast }: ErrorBlockProps): React.ReactElement {
  const ts = new Date(error.at).toLocaleTimeString();
  const tag = `${error.source}${error.toolName ? `:${error.toolName}` : ''}`;
  const messageLines = splitForWidth(error.message, width);
  const detailLines = error.detail ? splitForWidth(error.detail, width - 2) : [];

  return (
    <Box flexDirection="column" marginBottom={isLast ? 0 : 1}>
      <Box>
        <Text color={theme.error}>{glyphs.error} </Text>
        <Text dimColor>
          {`[${index}/${total}] `}
          {`[${ts}] `}
        </Text>
        <Text color={theme.warn}>{tag}</Text>
        <Text dimColor>{` · phase ${error.phase}`}</Text>
      </Box>

      <Box flexDirection="column" paddingLeft={2}>
        {messageLines.map((line) => (
          <Text key={`m-${line}`}>{line || ' '}</Text>
        ))}
      </Box>

      {detailLines.length > 0 ? (
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          <Text dimColor bold>
            details
          </Text>
          {detailLines.map((line) => (
            <Text key={`d-${line}`} dimColor>
              {line || ' '}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function splitForWidth(value: string, width: number): string[] {
  const safeWidth = Math.max(20, width);
  const out: string[] = [];
  for (const raw of value.replace(/\r/g, '').split('\n')) {
    if (raw.length === 0) {
      out.push('');
      continue;
    }
    let remaining = raw;
    while (remaining.length > safeWidth) {
      out.push(remaining.slice(0, safeWidth));
      remaining = remaining.slice(safeWidth);
    }
    out.push(remaining);
  }

  return out;
}

function formatErrorsForClipboard(errors: SessionError[]): string {
  return errors
    .map((error) => {
      const ts = new Date(error.at).toISOString();
      const tag = `${error.source}${error.toolName ? `:${error.toolName}` : ''}`;
      const head = `[${ts}] (${tag} · phase ${error.phase})`;
      const detail = error.detail ? `\n\n${error.detail}` : '';

      return `${head}\n${error.message}${detail}`;
    })
    .join('\n\n----\n\n');
}
