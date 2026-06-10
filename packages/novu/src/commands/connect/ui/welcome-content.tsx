import { Box, Text, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';

/**
 * First screen the user sees. The reveal is timed against the orb's entry
 * animation so it doesn't compete: the orb plays for ENTRY_MS, then after a
 * short hold the welcome text materializes through a dithered cascade
 * (`· → ░ → ▒ → ▓ → real char` per position) matching the orb's own
 * dithered aesthetic. Enter is ignored until the cascade completes — a
 * fast key-mash during the reveal won't skip past it.
 */
const WELCOME_REVEAL_START_MS = 1300;
const WELCOME_REVEAL_DURATION_MS = 900;
const WELCOME_REVEAL_TOTAL_MS = WELCOME_REVEAL_START_MS + WELCOME_REVEAL_DURATION_MS;
const WELCOME_FRAME_MS = 55;

const WELCOME_AGENT_ROTATIONS: ReadonlyArray<string> = [
  'a Claude Managed Agent',
  'a Google Vertex AI Agent',
  'an AI SDK Agent',
  'a Claude Managed Agent on AWS',
];

const WELCOME_CHANNELS_LABEL = 'Slack, Telegram, MS Teams';

/** Time each label stays fully readable before the next dither transition. */
const WELCOME_SWAP_HOLD_MS = 5200;
/** Dither-out + dither-in duration for each label change. */
const WELCOME_SWAP_TRANSITION_MS = 600;

export function WelcomeContent({ onContinue }: { onContinue: () => void }): React.ReactElement {
  const [elapsed, setElapsed] = React.useState(0);
  const bornAtRef = React.useRef(Date.now());

  React.useEffect(() => {
    const t = setInterval(() => {
      const e = Date.now() - bornAtRef.current;
      setElapsed(e);
      if (e >= WELCOME_REVEAL_TOTAL_MS) clearInterval(t);
    }, WELCOME_FRAME_MS);

    return () => clearInterval(t);
  }, []);

  const revealComplete = elapsed >= WELCOME_REVEAL_TOTAL_MS;
  // 0..1 progress through the dither cascade. Negative values (during the
  // hold before the cascade starts) clamp to 0 so DitherText renders the
  // pre-reveal noise state.
  const progress = Math.min(1, Math.max(0, (elapsed - WELCOME_REVEAL_START_MS) / WELCOME_REVEAL_DURATION_MS));
  const startedRevealing = elapsed >= WELCOME_REVEAL_START_MS;

  useInput((_input, key) => {
    if (!revealComplete) return;
    if (key.return || _input === ' ') onContinue();
  });

  // Reserve the same vertical space throughout — three lines with a blank
  // between each (matching `gap={1}` on the Box) — so the layout doesn't
  // jump when the cascade kicks off.
  //
  // `alignItems="center"` keeps every line centered WITHIN the Welcome Box.
  // Without it, the headline left-aligns to whatever child is widest — so
  // when the tagline (longest line) appears, the box widens and the
  // headline visually slides left. With centering, each line individually
  // centers and the headline stays in place.
  if (!startedRevealing) {
    return (
      <Box flexDirection="column" gap={1} alignItems="center">
        <Text> </Text>
        <Text> </Text>
        <Text> </Text>
        <Text> </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} alignItems="center">
      <DitherText text="Welcome to Novu Connect" progress={progress} seed={1} bold />
      {revealComplete ? (
        <>
          <WelcomeAnimatedTagline />
          <Text color="cyan">Press Enter to connect your first agent →</Text>
        </>
      ) : (
        // Hold the layout open while the headline finishes dithering so the
        // CTA doesn't shove up into view mid-cascade.
        <>
          <Text> </Text>
          <Text> </Text>
          <Text> </Text>
        </>
      )}
    </Box>
  );
}

function WelcomeAnimatedTagline(): React.ReactElement {
  const agentSlotWidth = maxLabelLength(WELCOME_AGENT_ROTATIONS);

  return (
    <Box flexDirection="column" alignItems="flex-start">
      <Box flexDirection="row">
        <Text dimColor>Spin up </Text>
        <Box width={agentSlotWidth}>
          <DitherSwapText items={WELCOME_AGENT_ROTATIONS} seed={11} holdMs={WELCOME_SWAP_HOLD_MS} />
        </Box>
      </Box>
      <Box flexDirection="row" flexWrap="wrap">
        <Text dimColor>and connect it to </Text>
        <Text bold color="white">
          {WELCOME_CHANNELS_LABEL}
        </Text>
        <Text dimColor> and more — all from your terminal</Text>
      </Box>
    </Box>
  );
}

/**
 * Cycles through `items`, dithering the current label out before the next one
 * materializes in. Slow hold + slow transition so the orb screen stays calm.
 */
function DitherSwapText({
  items,
  seed,
  holdMs,
  transitionMs = WELCOME_SWAP_TRANSITION_MS,
  startOffsetMs = 0,
}: {
  items: ReadonlyArray<string>;
  seed: number;
  holdMs: number;
  transitionMs?: number;
  startOffsetMs?: number;
}): React.ReactElement {
  const [index, setIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(1);
  const phaseRef = React.useRef<'hold' | 'out' | 'in'>('hold');
  const indexRef = React.useRef(0);
  const phaseStartedAtRef = React.useRef(Date.now() + startOffsetMs);
  const startedRef = React.useRef(startOffsetMs <= 0);

  React.useEffect(() => {
    indexRef.current = index;
  }, [index]);

  React.useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (!startedRef.current) {
        if (now < phaseStartedAtRef.current) {
          return;
        }
        startedRef.current = true;
        phaseStartedAtRef.current = now;
      }

      const elapsed = now - phaseStartedAtRef.current;

      if (phaseRef.current === 'hold') {
        setProgress(1);
        if (elapsed >= holdMs) {
          phaseRef.current = 'out';
          phaseStartedAtRef.current = now;
        }

        return;
      }

      if (phaseRef.current === 'out') {
        const outProgress = Math.min(1, elapsed / transitionMs);
        setProgress(1 - outProgress);
        if (outProgress >= 1) {
          const nextIndex = (indexRef.current + 1) % items.length;
          indexRef.current = nextIndex;
          setIndex(nextIndex);
          phaseRef.current = 'in';
          phaseStartedAtRef.current = now;
          setProgress(0);
        }

        return;
      }

      const inProgress = Math.min(1, elapsed / transitionMs);
      setProgress(inProgress);
      if (inProgress >= 1) {
        phaseRef.current = 'hold';
        phaseStartedAtRef.current = now;
        setProgress(1);
      }
    };

    tick();
    const timer = setInterval(tick, WELCOME_FRAME_MS);

    return () => clearInterval(timer);
  }, [holdMs, items.length, transitionMs, startOffsetMs]);

  const padded = items[index];

  return (
    <Text bold color="white">
      {renderDitherString(padded, progress, seed)}
    </Text>
  );
}

function maxLabelLength(items: ReadonlyArray<string>): number {
  return items.reduce((longest, item) => Math.max(longest, item.length), 0);
}

/**
 * Render `text` mid-materialization. Each non-space character gets a
 * deterministic "reveal time" in [0, 1) via a small integer hash on its
 * position + per-line `seed`. When `progress` crosses that threshold the
 * character settles into its real glyph; before that it shows a dither
 * glyph whose density tracks how far away from settling we still are. Same
 * Bayer-style aesthetic the orb uses, but applied to text.
 */
function renderDitherString(text: string, progress: number, seed: number): string {
  let rendered = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') {
      rendered += ' ';
      continue;
    }
    const hash = (((i + 1) * (seed * 2654435761 + 1)) >>> 0) / 0xffffffff;
    if (progress >= hash) {
      rendered += ch;
      continue;
    }
    const distance = hash - progress;
    if (distance > 0.55) rendered += ' ';
    else if (distance > 0.35) rendered += '·';
    else if (distance > 0.2) rendered += '░';
    else if (distance > 0.08) rendered += '▒';
    else rendered += '▓';
  }

  return rendered;
}

function DitherText({
  text,
  progress,
  seed,
  bold,
  dim,
  color,
}: {
  text: string;
  progress: number;
  seed: number;
  bold?: boolean;
  dim?: boolean;
  color?: string;
}): React.ReactElement {
  return (
    <Text bold={bold} dimColor={dim} color={color}>
      {renderDitherString(text, progress, seed)}
    </Text>
  );
}
