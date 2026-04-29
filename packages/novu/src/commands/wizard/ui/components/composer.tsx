import { Box, type Key, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';
import { matchSlashCommands, SLASH_COMMANDS, type SlashCommand } from '../slash-commands';
import { glyphs, theme } from '../theme';
import type { SessionState } from '../types';

interface ComposerProps {
  disabled: boolean;
  busy: boolean;
  width: number;
  history: string[];
  state: SessionState;
  errorCount: number;
  passThroughNav?: boolean;
  onBufferChange?: (length: number) => void;
  onSubmit: (text: string) => void;
  onSlashCommand: (command: string, rest: string) => void;
  onInterrupt: () => void;
  onExit: () => void;
}

const PHASE_LABEL: Record<SessionState['phase'], string> = {
  booting: 'booting',
  auth: 'auth',
  intake: 'intake',
  'installing-skills': 'installing skills',
  'agent-running': 'thinking',
  'awaiting-input': 'ready',
  done: 'done',
  failed: 'failed',
};

export function Composer(props: ComposerProps): React.ReactElement {
  const {
    disabled,
    busy,
    width,
    history,
    state,
    errorCount,
    passThroughNav = false,
    onBufferChange,
    onSubmit,
    onSlashCommand,
    onInterrupt,
    onExit,
  } = props;
  const [buffer, setBuffer] = React.useState('');
  const [historyIdx, setHistoryIdx] = React.useState<number | null>(null);
  const [highlightIdx, setHighlightIdx] = React.useState(0);
  const [hint, setHint] = React.useState<string | null>(null);
  const interruptArmedRef = React.useRef<number>(0);

  React.useEffect(() => {
    onBufferChange?.(buffer.length);
  }, [buffer, onBufferChange]);

  const suggestions: SlashCommand[] = React.useMemo(() => {
    if (!buffer.startsWith('/')) return [];
    const head = buffer.split(/\s+/)[0];

    return matchSlashCommands(head);
  }, [buffer]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset highlight whenever the suggestion list changes
  React.useEffect(() => {
    setHighlightIdx(0);
  }, [suggestions.length]);

  React.useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), 2500);

    return () => clearTimeout(timer);
  }, [hint]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      const now = Date.now();
      if (busy) {
        onInterrupt();
        interruptArmedRef.current = now;
        setHint('interrupting agent (press Ctrl+C again to exit)');

        return;
      }
      if (now - interruptArmedRef.current < 1500) {
        onExit();

        return;
      }
      interruptArmedRef.current = now;
      setBuffer('');
      setHint('press Ctrl+C again to exit');

      return;
    }

    if (key.ctrl && input === 'l') {
      onSlashCommand('/clear', '');

      return;
    }

    if (key.ctrl && input === 'r') {
      const last = history[history.length - 1];
      if (last) {
        setBuffer(last);
      }

      return;
    }

    if (passThroughNav && buffer.length === 0) {
      if (key.escape || key.upArrow || key.downArrow || key.return || key.tab) return;
    }

    if (key.escape) {
      setBuffer('');

      return;
    }

    if (key.upArrow && suggestions.length > 0) {
      setHighlightIdx((idx) => Math.max(0, idx - 1));

      return;
    }

    if (key.downArrow && suggestions.length > 0) {
      setHighlightIdx((idx) => Math.min(suggestions.length - 1, idx + 1));

      return;
    }

    if (key.upArrow && history.length > 0) {
      const next = historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setBuffer(history[next] ?? '');

      return;
    }

    if (key.downArrow && historyIdx !== null) {
      const next = historyIdx + 1;
      if (next >= history.length) {
        setHistoryIdx(null);
        setBuffer('');
      } else {
        setHistoryIdx(next);
        setBuffer(history[next] ?? '');
      }

      return;
    }

    if (key.tab && suggestions.length > 0) {
      const cmd = suggestions[highlightIdx] ?? suggestions[0];
      setBuffer(`${cmd.name} `);

      return;
    }

    if (key.return) {
      const trimmed = buffer.trim();
      if (!trimmed) return;
      handleSubmit(trimmed);

      return;
    }

    if (key.backspace || key.delete) {
      setBuffer((prev) => prev.slice(0, -1));

      return;
    }

    if (input && !key.meta && !key.ctrl) {
      setBuffer((prev) => prev + input);
    }
  });

  function handleSubmit(text: string) {
    if (text.startsWith('/')) {
      setBuffer('');
      setHistoryIdx(null);
      const [head, ...rest] = text.split(/\s+/);
      onSlashCommand(head, rest.join(' '));

      return;
    }
    if (busy || disabled) {
      setHint('agent is still working — press Ctrl+C to interrupt, or /exit to end the session');

      return;
    }
    setBuffer('');
    setHistoryIdx(null);
    onSubmit(text);
  }

  const promptColor = busy ? theme.warn : disabled ? theme.muted : theme.brand;
  const placeholder = derivePlaceholder(state.phase, disabled, busy);

  const phaseLabel = PHASE_LABEL[state.phase];
  const phaseColor =
    state.phase === 'agent-running' || state.phase === 'installing-skills'
      ? theme.warn
      : state.phase === 'awaiting-input'
        ? theme.ok
        : state.phase === 'failed'
          ? theme.error
          : theme.muted;

  const showSuggestions = suggestions.length > 0;
  const showHint = !showSuggestions && hint !== null;

  return (
    <Box
      flexDirection="column"
      width={width}
      flexShrink={0}
      borderStyle="single"
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={theme.muted}
    >
      {showSuggestions ? (
        <Box flexDirection="column" paddingX={2}>
          {suggestions.slice(0, 5).map((cmd, idx) => (
            <Text key={cmd.name} color={idx === highlightIdx ? theme.brand : theme.muted}>
              {cmd.name} <Text dimColor>{cmd.description}</Text>
            </Text>
          ))}
          {suggestions.length === 0 ? (
            <Text dimColor>no matching command (try {SLASH_COMMANDS.map((cmd) => cmd.name).join(', ')})</Text>
          ) : null}
        </Box>
      ) : null}
      {showHint ? (
        <Box paddingX={1}>
          <Text dimColor>{hint}</Text>
        </Box>
      ) : null}
      <Box width={width} paddingX={1}>
        <Box flexGrow={1}>
          <Text color={promptColor}>{glyphs.prompt} </Text>
          {buffer.length === 0 && placeholder ? (
            <Text dimColor>{placeholder}</Text>
          ) : (
            <Text>
              {buffer}
              <Text color={promptColor}>{'\u2588'}</Text>
            </Text>
          )}
        </Box>
        <Box>
          {busy ? (
            <Text color={theme.warn}>
              <Spinner type="dots" />{' '}
            </Text>
          ) : null}
          <Text color={phaseColor}>{phaseLabel}</Text>
          {errorCount > 0 ? <Text color={theme.error}>{` ${glyphs.bullet} ${errorCount}!`}</Text> : null}
        </Box>
      </Box>
    </Box>
  );
}

export type { Key };

function derivePlaceholder(phase: SessionState['phase'], disabled: boolean, busy: boolean): string {
  if (busy) return 'agent is working\u2026 type to queue';
  if (phase === 'intake') return 'use \u2191\u2193 to choose, enter to confirm \u2014 or type / for shortcuts';
  if (!disabled) return '';
  if (phase === 'booting') return 'starting up';
  if (phase === 'auth') return 'waiting for browser auth';
  if (phase === 'done' || phase === 'failed') return 'session ended';

  return '';
}
