import { Select, TextInput } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { ChannelChoice } from '../types';
import type { ConnectStore } from './store';
import { useStore } from './use-store';

/**
 * Channel brand colours used to tint the orb when a channel is hovered or
 * active. These are well-known brand-colour hexes; we deliberately do NOT
 * render any brand logos — just colour + a single letter glyph as an
 * integration identifier.
 */
const CHANNEL_TINTS: Record<ChannelChoice, string> = {
  slack: '#ECB22E', // Slack yellow
  telegram: '#26A5E4', // Telegram blue
  email: '#34A853', // generic mail green
  whatsapp: '#25D366', // WhatsApp green
  teams: '#5059C9', // Teams indigo
  skip: 'white',
};
const DEFAULT_ORB_COLOR = 'white';

/**
 * Plain text channel names rendered inside the orb. Plain words, not logos.
 * `skip` is undefined so the orb stays plain when the user opts out.
 */
const CHANNEL_LABELS: Partial<Record<ChannelChoice, string>> = {
  slack: 'SLACK',
  telegram: 'TELEGRAM',
  email: 'EMAIL',
  whatsapp: 'WHATSAPP',
  teams: 'TEAMS',
};

export interface AppProps {
  store: ConnectStore;
  /** Called by the app once it has mounted, so the controller can wire the Ink exit. */
  registerExit: (exit: () => void) => void;
}

const NEW_AGENT_VALUE = '__new__';

export function App({ store, registerExit }: AppProps): React.ReactElement {
  const phase = useStore(store.phase);
  const { exit } = useApp();

  // Tracks which channel the user is hovering in the picker, so the orb can
  // tint to that brand colour before they commit. Reset to `null` when we
  // leave the picker — the channel-specific phases below derive their tint
  // directly from the phase kind.
  const [hoveredChannel, setHoveredChannel] = React.useState<ChannelChoice | null>(null);

  React.useEffect(() => {
    registerExit(exit);
  }, [exit, registerExit]);

  // Global Ctrl+C handler. We render Ink with `exitOnCtrlC: false` so child
  // input handlers (Select, TextInput, etc.) get a clean shot at keystrokes
  // without Ink unmounting under them. The side-effect is Ctrl+C goes
  // nowhere unless we wire it ourselves — this top-level handler runs
  // regardless of which phase / focused widget is active. Exit code 130
  // matches the conventional SIGINT exit.
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exitCode = 130;
      exit();
    }
  });

  React.useEffect(() => {
    if (phase.kind !== 'pick-channel') setHoveredChannel(null);
  }, [phase.kind]);

  const tintColor = computeOrbTint(phase, hoveredChannel);
  const label = computeOrbLabel(phase, hoveredChannel);

  // Layout pattern: the orb lives at the top of every screen, always
  // breathing/shimmering. Everything else slots beneath it, horizontally
  // centered so the welcome text / phase content / QR codes all line up
  // visually with the orb's center. Single persistent visual identity
  // instead of a different header/spinner per phase.
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1} alignItems="center">
      <PersistentOrb tintColor={tintColor} label={label} />
      <PhaseContent phase={phase} onChannelHover={setHoveredChannel} />
    </Box>
  );
}

/**
 * Derive the orb's colour from the current phase plus, for the picker only,
 * the channel currently being hovered. Falls back to white whenever there's
 * no channel context (auth, generating, etc.) so the orb stays neutral
 * outside of channel selection.
 */
function computeOrbTint(
  phase: ReturnType<ConnectStore['phase']['get']>,
  hoveredChannel: ChannelChoice | null
): string {
  switch (phase.kind) {
    case 'pick-channel':
      return hoveredChannel ? CHANNEL_TINTS[hoveredChannel] : DEFAULT_ORB_COLOR;
    case 'adding-slack':
    case 'paste-slack-token':
    case 'running-slack-quick-setup':
    case 'waiting-slack':
      return CHANNEL_TINTS.slack;
    case 'adding-telegram':
    case 'telegram-intro':
    case 'telegram-link-token':
    case 'telegram-test':
      return CHANNEL_TINTS.telegram;
    case 'adding-email':
    case 'email-ready':
      return CHANNEL_TINTS.email;
    case 'success':
      return phase.connectedChannel ? CHANNEL_TINTS[phase.connectedChannel] : DEFAULT_ORB_COLOR;
    default:
      return DEFAULT_ORB_COLOR;
  }
}

/**
 * Pick the channel label (SLACK / TELEGRAM / EMAIL / WHATSAPP / TEAMS)
 * rendered inside the orb for the current phase. Returns undefined when
 * there's no channel context — the orb stays plain on auth/generating/etc.
 */
function computeOrbLabel(
  phase: ReturnType<ConnectStore['phase']['get']>,
  hoveredChannel: ChannelChoice | null
): string | undefined {
  switch (phase.kind) {
    case 'pick-channel':
      return hoveredChannel ? CHANNEL_LABELS[hoveredChannel] : undefined;
    case 'adding-slack':
    case 'paste-slack-token':
    case 'running-slack-quick-setup':
    case 'waiting-slack':
      return CHANNEL_LABELS.slack;
    case 'adding-telegram':
    case 'telegram-intro':
    case 'telegram-link-token':
    case 'telegram-test':
      return CHANNEL_LABELS.telegram;
    case 'adding-email':
    case 'email-ready':
      return CHANNEL_LABELS.email;
    case 'success':
      return phase.connectedChannel ? CHANNEL_LABELS[phase.connectedChannel] : undefined;
    default:
      return undefined;
  }
}

function PhaseContent({
  phase,
  onChannelHover,
}: {
  phase: ReturnType<ConnectStore['phase']['get']>;
  onChannelHover: (channel: ChannelChoice | null) => void;
}): React.ReactElement {
  switch (phase.kind) {
    case 'welcome':
      return <WelcomeContent onContinue={phase.resolve} />;

    case 'auth':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="cyan">{phase.status}</Text>
          {phase.dashboardUrl ? (
            <Box flexDirection="column">
              <Text dimColor>If your browser didn't open, visit:</Text>
              <Text color="cyan">{phase.dashboardUrl}</Text>
            </Box>
          ) : null}
        </Box>
      );

    case 'listing-agents':
      return <Text color="cyan">Checking for existing agents…</Text>;

    case 'loading-integrations':
      return <Text color="cyan">Looking up managed integrations…</Text>;

    case 'pick': {
      const options = [
        ...phase.agents.map((agent) => ({
          label: `${agent.name} (${agent.identifier})`,
          value: agent.id,
        })),
        { label: '+ Create a new agent', value: NEW_AGENT_VALUE },
      ];

      return (
        <Box flexDirection="column" gap={1}>
          <Text>You already have agents in this environment. What would you like to do?</Text>
          <Select
            options={options}
            onChange={(value) => {
              if (value === NEW_AGENT_VALUE) {
                phase.resolve({ action: 'new' });

                return;
              }
              const agent = phase.agents.find((a) => a.id === value);
              if (agent) phase.resolve({ action: 'use', agent });
            }}
          />
        </Box>
      );
    }

    case 'describe':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Describe your agent</Text>
          <Text dimColor>e.g. a customer-support agent that books demos and escalates billing questions.</Text>
          <Box borderStyle="round" paddingX={1}>
            <TextInput
              placeholder="Describe what your agent should do…"
              onSubmit={(value) => phase.resolve(value)}
            />
          </Box>
          <Text dimColor>Press Enter to submit. Minimum 8 characters.</Text>
        </Box>
      );

    case 'generating':
      return <GeneratingContent />;

    case 'creating':
      return <Text color="cyan">{`Creating agent "${phase.name}"…`}</Text>;

    case 'pick-channel': {
      const options: Array<{ label: string; value: ChannelChoice }> = [
        { label: 'Slack (recommended)', value: 'slack' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Email', value: 'email' },
        { label: 'WhatsApp — coming soon', value: 'whatsapp' },
        { label: 'Microsoft Teams — coming soon', value: 'teams' },
        { label: 'Skip — set up later in dashboard', value: 'skip' },
      ];

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Pick a channel to connect this agent to</Text>
          <ChannelSelect
            options={options}
            onChange={(value) => phase.resolve(value)}
            onHighlight={onChannelHover}
          />
        </Box>
      );
    }

    case 'adding-slack':
      return <Text color="cyan">Linking Slack to your agent…</Text>;

    case 'paste-slack-token':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Paste a Slack App Configuration Token</Text>
          <Text dimColor>
            Your Slack integration has no OAuth credentials yet. Novu can create the Slack app for you from a manifest
            if you paste a short-lived configuration token.
          </Text>
          <Box flexDirection="column">
            <Text dimColor>1. Visit </Text>
            <Text color="cyan">https://api.slack.com/apps</Text>
            <Text dimColor>2. Open “Your Apps” → “Manage” → “App Configuration Tokens”</Text>
            <Text dimColor>3. Generate a token for your workspace (starts with xoxe.xoxp-)</Text>
          </Box>
          {phase.retry ? (
            <Text color="yellow">Previous token was rejected by Slack. Generate a fresh one and try again.</Text>
          ) : null}
          <Box borderStyle="round" paddingX={1}>
            <TextInput
              placeholder="xoxe.xoxp-…"
              onSubmit={(value) => {
                const trimmed = value.trim();
                if (!trimmed) {
                  phase.reject(new Error('No Slack App Configuration Token provided.'));

                  return;
                }
                phase.resolve(trimmed);
              }}
            />
          </Box>
          <Text dimColor>The token is sent to your Novu API once, used to create the Slack app, then discarded.</Text>
        </Box>
      );

    case 'running-slack-quick-setup':
      return <Text color="cyan">Creating Slack app from manifest…</Text>;

    case 'waiting-slack':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Authorize Slack to finish setup</Text>
          <Box flexDirection="column">
            <Text dimColor>Opened in your browser. If nothing happened, visit:</Text>
            <Text color="cyan">{phase.authorizeUrl}</Text>
          </Box>
          <Text dimColor>Waiting for Slack authorization…</Text>
        </Box>
      );

    case 'adding-email':
      return <Text color="cyan">Linking Email to your agent…</Text>;

    case 'email-ready':
      return (
        <EmailReadyContent
          inboundAddress={phase.inboundAddress}
          mailtoUrl={phase.mailtoUrl}
          onContinue={phase.resolve}
        />
      );

    case 'email-waiting':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">
            Send any message to your agent
          </Text>
          <Box flexDirection="column" paddingY={1}>
            <Text bold>{phase.inboundAddress}</Text>
          </Box>
          <Text dimColor>Waiting for your email to arrive…</Text>
        </Box>
      );

    case 'adding-telegram':
      return <Text color="cyan">Linking Telegram to your agent…</Text>;

    case 'telegram-intro':
      return <TelegramIntroContent botfatherQr={phase.botfatherQr} onContinue={phase.resolve} />;

    case 'telegram-link-token':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">
            Step 2 of 3 · Save your bot token
          </Text>
          <Text dimColor>
            Scan with your phone to open a page where you can paste the BotFather token. We'll handle registering the
            webhook for you.
          </Text>
          <Text>{phase.mobileQr}</Text>
          <Box flexDirection="column">
            <Text dimColor>Or open this on your phone:</Text>
            <Text color="cyan">{phase.mobileUrl}</Text>
          </Box>
          <Text dimColor>Waiting for your bot token…</Text>
        </Box>
      );

    case 'telegram-test':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">
            Step 3 of 3 · Say hello to your bot
          </Text>
          <Text dimColor>
            Scan to open <Text color="white">@{phase.botUsername}</Text> in Telegram and tap Start.
          </Text>
          <Text>{phase.deepLinkQr}</Text>
          <Box flexDirection="column">
            <Text dimColor>Or open this link:</Text>
            <Text color="cyan">{phase.deepLinkUrl}</Text>
          </Box>
          <Text dimColor>Waiting for /start in Telegram…</Text>
        </Box>
      );

    case 'sending-welcome':
      return <Text color="cyan">Asking your agent to say hello…</Text>;

    case 'success':
      return <SuccessView phase={phase} />;

    case 'error':
      return <Text color="red">✗ {phase.message}</Text>;

    default:
      // exhaustive check: TypeScript should narrow phase to `never` here.
      return <Text />;
  }
}

// ---------------------------------------------------------------------------
// Persistent orb
// ---------------------------------------------------------------------------

/**
 * Lives at the top of `<App>` for the full lifetime of the CLI run. Owns the
 * animation frame counter (so every other screen can be stateless) AND drives
 * the entry animation: at mount, `scale` ramps from 0 → 1 over ENTRY_MS with
 * an ease-out cubic so the orb appears to grow into existence. After that
 * the scale stays at 1 and the orb breathes/shimmers indefinitely.
 */
const ENTRY_MS = 1200;

function PersistentOrb({
  tintColor,
  label,
}: {
  tintColor: string;
  label: string | undefined;
}): React.ReactElement {
  const [frame, setFrame] = React.useState(0);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const bornAtRef = React.useRef(Date.now());

  React.useEffect(() => {
    const t = setInterval(() => {
      setFrame((f) => f + 1);
      setElapsedMs(Date.now() - bornAtRef.current);
    }, ORB_FRAME_MS);

    return () => clearInterval(t);
  }, []);

  const entryProgress = Math.min(1, elapsedMs / ENTRY_MS);
  // Ease-out cubic — fast start, gentle landing. Plays nicer than linear
  // and avoids the "snap to full size" feel of ease-in.
  const scale = 1 - Math.pow(1 - entryProgress, 3);

  return <Orb phase={frame} scale={scale} tintColor={tintColor} label={label} />;
}

/**
 * Channel picker that emits `onHighlight` as the user arrows up/down so the
 * orb can react in real time. `@inkjs/ui`'s built-in Select fires only on
 * final commit, which is too late for our purposes.
 */
function ChannelSelect({
  options,
  onChange,
  onHighlight,
}: {
  options: Array<{ label: string; value: ChannelChoice }>;
  onChange: (value: ChannelChoice) => void;
  onHighlight: (value: ChannelChoice | null) => void;
}): React.ReactElement {
  const [idx, setIdx] = React.useState(0);

  // Seed the parent with the initial highlight so the orb doesn't sit on
  // white for a frame before the user touches the arrow keys.
  React.useEffect(() => {
    onHighlight(options[0]?.value ?? null);
    // We only want to fire on mount; subsequent highlights flow through useInput.
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  }, []);

  useInput((_input, key) => {
    if (key.upArrow) {
      const next = (idx - 1 + options.length) % options.length;
      setIdx(next);
      onHighlight(options[next].value);
    } else if (key.downArrow) {
      const next = (idx + 1) % options.length;
      setIdx(next);
      onHighlight(options[next].value);
    } else if (key.return) {
      onChange(options[idx].value);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, i) => (
        <Text key={opt.value} color={i === idx ? 'cyan' : undefined}>
          {i === idx ? '› ' : '  '}
          {opt.label}
        </Text>
      ))}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Per-phase content components (used by PhaseContent above)
// ---------------------------------------------------------------------------

const TAGLINES: ReadonlyArray<string> = [
  'Listening for your idea…',
  'Tuning the system prompt…',
  'Picking the right tools…',
  'Wiring up MCP servers…',
  'Reaching for Anthropic skills…',
  'Adding finishing sparkles…',
];

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

function WelcomeContent({ onContinue }: { onContinue: () => void }): React.ReactElement {
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
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} alignItems="center">
      <DitherText text="Welcome to Novu Connect" progress={progress} seed={1} bold />
      {revealComplete ? (
        <>
          <Text dimColor>Spin up a managed AI agent and connect it to your team — all from your terminal.</Text>
          <Text color="cyan">Press Enter to sign in or create an account →</Text>
        </>
      ) : (
        // Hold the layout open while the headline finishes dithering so the
        // CTA doesn't shove up into view mid-cascade.
        <>
          <Text> </Text>
          <Text> </Text>
        </>
      )}
    </Box>
  );
}

/**
 * Render `text` mid-materialization. Each non-space character gets a
 * deterministic "reveal time" in [0, 1) via a small integer hash on its
 * position + per-line `seed`. When `progress` crosses that threshold the
 * character settles into its real glyph; before that it shows a dither
 * glyph whose density tracks how far away from settling we still are. Same
 * Bayer-style aesthetic the orb uses, but applied to text.
 */
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
  let rendered = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Preserve whitespace verbatim so words stay legible while the rest of
    // the line is still resolving — looks much cleaner than dithering the
    // gaps too.
    if (ch === ' ') {
      rendered += ' ';
      continue;
    }
    // Knuth multiplicative hash → uniform-ish in [0,1). seed varies the
    // hash space per line so the three lines don't reveal in lockstep.
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

  return (
    <Text bold={bold} dimColor={dim} color={color}>
      {rendered}
    </Text>
  );
}

function GeneratingContent(): React.ReactElement {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const startedAt = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);

    return () => clearInterval(t);
  }, []);

  // Hold each tagline for ~3s before rotating. The orb keeps moving; this
  // gives the user words for what's happening without re-rendering a spinner
  // line right above the orb.
  const tagline = TAGLINES[Math.floor(elapsed / 3) % TAGLINES.length];

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color="white" bold>
          Crafting your agent
        </Text>
        <Text dimColor>· {elapsed}s</Text>
      </Box>
      <Text dimColor>{tagline}</Text>
    </Box>
  );
}

function EmailReadyContent({
  inboundAddress,
  mailtoUrl,
  onContinue,
}: {
  inboundAddress: string;
  mailtoUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Your agent has an inbox
      </Text>
      <Text dimColor>Send any email to the address below — your agent will read it and reply to your inbox.</Text>
      <Box flexDirection="column" paddingY={1}>
        <Text bold>{inboundAddress}</Text>
      </Box>
      <Text dimColor>{`mailto link: ${mailtoUrl.slice(0, 80)}${mailtoUrl.length > 80 ? '…' : ''}`}</Text>
      <Text color="cyan">Press Enter to open a pre-filled draft in your default mail client →</Text>
    </Box>
  );
}

function TelegramIntroContent({
  botfatherQr,
  onContinue,
}: {
  botfatherQr: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') {
      onContinue();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 1 of 3 · Create your Telegram bot
      </Text>
      <Box flexDirection="column">
        <Text>
          <Text color="white" bold>
            1.
          </Text>{' '}
          Open Telegram and message <Text color="cyan">@BotFather</Text>.
        </Text>
        <Text>
          <Text color="white" bold>
            2.
          </Text>{' '}
          Run <Text color="magenta">/newbot</Text>, choose a name and username.
        </Text>
        <Text>
          <Text color="white" bold>
            3.
          </Text>{' '}
          Keep the BotFather chat open — you'll paste the token from there in the next step.
        </Text>
      </Box>
      <Text dimColor>Or scan to open BotFather on your phone:</Text>
      <Text>{botfatherQr}</Text>
      <Text dimColor>Press Enter when you have your bot token →</Text>
    </Box>
  );
}

function SuccessView({
  phase,
}: {
  phase: Extract<ReturnType<ConnectStore['phase']['get']>, { kind: 'success' }>;
}): React.ReactElement {
  const { agent, dashboardUrl, environmentSlug, connectedChannel } = phase;
  const agentUrl = environmentSlug
    ? `${dashboardUrl}/env/${environmentSlug}/agents/${encodeURIComponent(agent.identifier)}`
    : `${dashboardUrl}/agents/${encodeURIComponent(agent.identifier)}`;

  const channelLabel =
    connectedChannel === 'slack' ? 'Slack' : connectedChannel === 'telegram' ? 'Telegram' : null;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Your agent is live.</Text>
      <Box flexDirection="column">
        <Text>
          <Text bold>Agent:</Text> {agent.name} <Text dimColor>({agent.identifier})</Text>
        </Text>
        {channelLabel ? (
          <Text color="cyan">Check {channelLabel} — your agent just messaged you.</Text>
        ) : (
          <Text dimColor>No channel connected. Run `npx novu connect` again to wire one up.</Text>
        )}
        <Text>
          <Text bold>Dashboard:</Text> {agentUrl}
        </Text>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Orb renderer — dithered monochrome braille sphere
// ---------------------------------------------------------------------------
//
// Render path:
//
// - Virtual pixel buffer is 2× wider and 4× taller than the displayed grid.
//   Each terminal cell packs eight pixels (2 cols × 4 rows) into a single
//   Unicode braille character (U+2800–U+28FF), where each pixel maps to one
//   of the eight dot bits. ~84 × 48 pixel canvas in only 42 × 12 terminal cells.
//
// - Sphere shading is plain Lambert lighting: at each pixel we reconstruct
//   the sphere's normal from (sx, sy), the implied z = √(1 − r²), and dot
//   with a light direction that slowly rotates around the vertical axis so
//   the highlight drifts across the surface.
//
// - The continuous brightness signal is thresholded through an 8×8 Bayer
//   matrix to produce the classic 1-bit ordered-dithered look. Lit hemisphere
//   shows dense dots, terminator dissolves into sparser patterns, the unlit
//   hemisphere goes dark.
//
// - `scale` (0..1) shrinks the orb's effective radius. Stars stay visible
//   throughout — they're our floor of "something is on screen" during the
//   entry animation when the orb itself is still a dot.
//
// - The whole thing renders as one Text per row (one color), which keeps
//   Ink's reconciler cheap even at 10 fps.

const PX_W = 84;
const PX_H = 48;
const TERM_W = PX_W / 2;
const TERM_H = PX_H / 4;
const PX_CX = 42;
const PX_CY = 24;
const ORB_RADIUS = 22;
const ORB_FRAME_MS = 100;

// Standard 8×8 Bayer dithering matrix, values 0–63. Lookup is `BAYER_8[y & 7][x & 7] / 64`,
// giving a threshold in [0, 1) compared against the pixel's brightness.
const BAYER_8: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Bit positions for each dot in a 2×4 braille cell (column, row in the cell).
const BRAILLE_BITS: ReadonlyArray<{ dx: number; dy: number; bit: number }> = [
  { dx: 0, dy: 0, bit: 0x01 },
  { dx: 0, dy: 1, bit: 0x02 },
  { dx: 0, dy: 2, bit: 0x04 },
  { dx: 1, dy: 0, bit: 0x08 },
  { dx: 1, dy: 1, bit: 0x10 },
  { dx: 1, dy: 2, bit: 0x20 },
  { dx: 0, dy: 3, bit: 0x40 },
  { dx: 1, dy: 3, bit: 0x80 },
];

function Orb({
  phase,
  scale,
  tintColor,
  label,
}: {
  phase: number;
  scale: number;
  tintColor: string;
  label: string | undefined;
}): React.ReactElement {
  const rows: React.ReactElement[] = [];
  for (let row = 0; row < TERM_H; row++) {
    let line = '';
    for (let col = 0; col < TERM_W; col++) {
      const baseX = col * 2;
      const baseY = row * 4;
      let code = 0x2800;
      for (const dot of BRAILLE_BITS) {
        if (samplePixel(baseX + dot.dx, baseY + dot.dy, phase, scale, label)) {
          code |= dot.bit;
        }
      }
      line += String.fromCharCode(code);
    }
    rows.push(
      <Text key={row} color={tintColor}>
        {line}
      </Text>
    );
  }

  return <Box flexDirection="column">{rows}</Box>;
}

// 5×7 binary glyphs covering A C E G H I K L M P R S T W — every uppercase
// letter we need for SLACK / TELEGRAM / EMAIL / WHATSAPP / TEAMS. '1' = lit
// pixel, '0' = transparent (defers to the sphere shading underneath).
const GLYPH_W = 5;
const GLYPH_H = 7;
const GLYPHS: Record<string, ReadonlyArray<string>> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
};

/**
 * Returns true if `(px, py)` is a lit pixel of the `label` text rendered
 * centered in the sphere. Spacing tightens to 0 for words >5 letters so
 * TELEGRAM/WHATSAPP fit inside the 44-pixel sphere diameter without
 * clipping at the edges.
 */
function isLabelPixel(px: number, py: number, label: string | undefined): boolean {
  if (!label) return false;
  const spacing = label.length <= 5 ? 1 : 0;
  const stride = GLYPH_W + spacing;
  const totalW = label.length * GLYPH_W + (label.length - 1) * spacing;
  const left = PX_CX - Math.floor(totalW / 2);
  const top = PX_CY - Math.floor(GLYPH_H / 2);
  const lx = px - left;
  const ly = py - top;
  if (lx < 0 || lx >= totalW || ly < 0 || ly >= GLYPH_H) return false;
  const letterIdx = Math.floor(lx / stride);
  if (letterIdx >= label.length) return false;
  const innerX = lx - letterIdx * stride;
  if (innerX >= GLYPH_W) return false; // in inter-letter gap
  const bitmap = GLYPHS[label[letterIdx]];
  if (!bitmap) return false;

  return bitmap[ly][innerX] === '1';
}

function samplePixel(
  px: number,
  py: number,
  phase: number,
  scale: number,
  label: string | undefined
): boolean {
  // Effective radius shrinks with `scale` during the entry animation. At
  // scale=0 the sphere has no radius — every "inside" check fails — and only
  // the starfield is visible. At scale=1 the sphere is full-size.
  const effectiveR = Math.max(0.001, ORB_RADIUS * scale);
  const sx = (px - PX_CX) / effectiveR;
  const sy = (py - PX_CY) / effectiveR;
  const r2 = sx * sx + sy * sy;

  if (r2 < 1) {
    // Reconstruct z from the sphere equation (front hemisphere) → unit
    // normal at this pixel for shading.
    const sz = Math.sqrt(1 - r2);

    // Light direction: rotating slowly around the vertical axis so the
    // bright pole drifts left-to-right. Offset slightly downward to feel
    // like a natural overhead-front desk-lamp position.
    const t = phase * 0.04;
    const lx = Math.cos(t) * 0.65;
    const ly = -0.45;
    const lz = Math.sqrt(Math.max(0.01, 1 - lx * lx - ly * ly));

    const lambert = Math.max(0, sx * lx + sy * ly + sz * lz);

    // Tight specular — small bright cluster of dots tracking the light
    // direction, sells the "smooth glass sphere" feel.
    const spec = Math.pow(lambert, 12) * 0.35;

    // A hair of ambient so the unlit side still occasionally lights up a
    // pixel through the dither — keeps the terminator alive.
    let intensity = Math.min(1, lambert * 0.85 + spec + 0.04);

    // Label overlay: boost intensity to nearly-on at label pixels so the
    // word reads as a dense cluster, but still pass through the Bayer
    // threshold so the same dotted texture as the rest of the orb applies —
    // the text blends INTO the sphere rather than being a solid override.
    // Gated on the entry animation being mostly complete so the label
    // doesn't pop in mid-grow.
    if (scale > 0.85 && isLabelPixel(px, py, label)) {
      intensity = 0.95;
    }

    const threshold = BAYER_8[py & 7][px & 7] / 64;

    return intensity > threshold;
  }

  // ---------------------------------------------------------------------
  // Outside the sphere
  // ---------------------------------------------------------------------

  // Plasma wisps: subtle tendrils that occasionally extend just past the
  // sphere edge and pull back, suggesting the orb is alive without
  // breaking its circular silhouette.
  //
  // Calmed-down design:
  // - Reach is short (`WISP_REACH = 0.22`) so wisps hug the surface.
  // - Steep quadratic falloff so density drops sharply with distance.
  // - Low spatial frequencies → smooth, large shapes (not jittery detail).
  // - Slow temporal coefficients → gentle evolution.
  // - Negative bias so most of the time the wisp field is quiet; only
  //   the positive peaks of the superposed sines become visible.
  // - `WISP_DELAY_FRAMES` keeps the field completely off until the
  //   sphere has been fully visible for ~2 s — gives the user a clean
  //   circle to read first, then wisps fade in over `WISP_FADE_FRAMES`.
  if (scale > 0.95) {
    const WISP_DELAY_FRAMES = 20; // ~2 s after mount
    const WISP_FADE_FRAMES = 20; // ~2 s ramp-in
    const activation = Math.max(0, Math.min(1, (phase - WISP_DELAY_FRAMES) / WISP_FADE_FRAMES));
    if (activation > 0) {
      const d = Math.sqrt(r2);
      const WISP_REACH = 0.22;
      if (d < 1 + WISP_REACH) {
        const proximityLinear = Math.max(0, 1 - (d - 1) / WISP_REACH);
        const proximity = proximityLinear * proximityLinear; // quadratic falloff
        const noise =
          Math.sin(sx * 3 + phase * 0.05) * 0.3 +
          Math.sin(sy * 2.5 - phase * 0.035) * 0.3 +
          Math.sin((sx + sy) * 2 + phase * 0.04) * 0.2 +
          Math.sin((sx - sy) * 2.5 - phase * 0.03) * 0.2;
        const intensity = Math.max(0, noise * 0.45 - 0.15) * proximity * activation;
        const threshold = BAYER_8[py & 7][px & 7] / 64;
        if (intensity > threshold) return true;
      }
    }
  }

  // Background starfield — sparse, stable, phase-independent so the
  // distant stars don't twitch behind a steady sphere. Visible from
  // frame 0 so the canvas isn't empty during entry.
  const starSeed = (px * 137 + py * 211) % 4001;
  if (starSeed === 0) return true;
  if (starSeed === 1117) return true;
  if (starSeed === 2531) return true;
  if (starSeed === 3203) return true;

  return false;
}
