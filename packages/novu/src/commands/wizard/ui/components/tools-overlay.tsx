import clipboardy from 'clipboardy';
import { Box, Text, useInput, useStdout } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import React from 'react';
import { shortenToolName } from '../../agent/tool-labels';
import { applyScrollAction, type ScrollAction, useScrollKeys } from '../hooks/use-scroll-keys';
import { formatDuration } from '../state/session';
import { glyphs, theme } from '../theme';
import type { ToolCall } from '../types';

interface ToolsOverlayProps {
  calls: ToolCall[];
  width: number;
  height: number;
  onDismiss: () => void;
}

export function ToolsOverlay({ calls, width, height, onDismiss }: ToolsOverlayProps): React.ReactElement {
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
    const id = setTimeout(() => scrollRef.current?.scrollToBottom(), 0);

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
        clipboardy.writeSync(formatToolsForClipboard(calls));
        setCopyHint('copied all tool calls to clipboard');
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

  const errorCount = calls.filter((call) => call.isError).length;
  const inFlightCount = calls.filter((call) => call.endedAt === undefined).length;

  return (
    <Box flexDirection="column" width={width} height={height} borderStyle="round" borderColor={theme.tool} paddingX={1}>
      <Box justifyContent="space-between" width={innerWidth}>
        <Text bold color={theme.brand}>
          {glyphs.tool} session tool calls ({calls.length})
          {errorCount > 0 ? <Text color={theme.error}>{` ${glyphs.bullet} ${errorCount} failed`}</Text> : null}
          {inFlightCount > 0 ? <Text color={theme.warn}>{` ${glyphs.bullet} ${inFlightCount} running`}</Text> : null}
        </Text>
        <Text dimColor>esc close · ↑↓/wheel scroll · PgUp/PgDn page · g/G top/bottom · c copy</Text>
      </Box>

      {calls.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>no tool calls in this session yet</Text>
        </Box>
      ) : (
        <Box flexDirection="column" height={scrollHeight} marginTop={1} flexShrink={1} minHeight={0} overflow="hidden">
          <ScrollView ref={scrollRef} flexDirection="column" width={innerWidth}>
            {calls.map((call, idx) => (
              <ToolBlock
                key={call.id}
                call={call}
                index={idx + 1}
                total={calls.length}
                width={innerWidth}
                isLast={idx === calls.length - 1}
              />
            ))}
          </ScrollView>
        </Box>
      )}

      <Box marginTop={1}>{copyHint ? <Text color={theme.ok}>{copyHint}</Text> : <Text dimColor> </Text>}</Box>
    </Box>
  );
}

interface ToolBlockProps {
  call: ToolCall;
  index: number;
  total: number;
  width: number;
  isLast: boolean;
}

function ToolBlock({ call, index, total, width, isLast }: ToolBlockProps): React.ReactElement {
  const ts = new Date(call.startedAt).toLocaleTimeString();
  const elapsed = call.endedAt ? formatDuration(call.endedAt - call.startedAt) : 'running…';
  const status = describeStatus(call);
  const inputLines = call.inputSummary ? splitForWidth(call.inputSummary, width - 2) : [];
  const resultLines = call.resultText ? splitForWidth(call.resultText, width - 2) : [];

  return (
    <Box flexDirection="column" marginBottom={isLast ? 0 : 1}>
      <Box>
        <Text color={status.color}>{status.glyph} </Text>
        <Text dimColor>
          {`[${index}/${total}] `}
          {`[${ts}] `}
        </Text>
        <Text color={theme.brand}>{shortenToolName(call.name)}</Text>
        {call.label ? <Text dimColor>{` ${glyphs.bullet} ${call.label}`}</Text> : null}
        <Text dimColor>{` ${glyphs.bullet} ${elapsed}`}</Text>
      </Box>

      {inputLines.length > 0 ? (
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          <Text dimColor bold>
            input
          </Text>
          {inputLines.map((line, lineIdx) => (
            <Text key={`i-${call.id}-${lineIdx}`} dimColor>
              {line || ' '}
            </Text>
          ))}
        </Box>
      ) : null}

      {resultLines.length > 0 ? (
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          <Text dimColor bold color={call.isError ? theme.error : undefined}>
            {call.isError ? 'error' : 'result'}
          </Text>
          {resultLines.map((line, lineIdx) => (
            <Text
              key={`r-${call.id}-${lineIdx}`}
              color={call.isError ? theme.error : undefined}
              dimColor={!call.isError}
            >
              {line || ' '}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function describeStatus(call: ToolCall): { glyph: string; color: string } {
  if (call.endedAt === undefined) return { glyph: glyphs.spinner, color: theme.warn };
  if (call.isError) return { glyph: glyphs.error, color: theme.error };

  return { glyph: glyphs.ok, color: theme.ok };
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

function formatToolsForClipboard(calls: ToolCall[]): string {
  return calls
    .map((call) => {
      const ts = new Date(call.startedAt).toISOString();
      const status = call.endedAt === undefined ? 'running' : call.isError ? 'error' : 'ok';
      const elapsed = call.endedAt ? formatDuration(call.endedAt - call.startedAt) : '—';
      const head = `[${ts}] (${status} · ${elapsed}) ${shortenToolName(call.name)}${call.label ? ` · ${call.label}` : ''}`;
      const input = call.inputSummary ? `\n\ninput:\n${call.inputSummary}` : '';
      const result = call.resultText ? `\n\n${call.isError ? 'error' : 'result'}:\n${call.resultText}` : '';

      return `${head}${input}${result}`;
    })
    .join('\n\n----\n\n');
}
