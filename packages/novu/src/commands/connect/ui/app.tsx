import { Select, TextInput } from '@inkjs/ui';
import { Box, Text, useApp, useInput } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { ConnectStore } from './store';
import { useStore } from './use-store';

export interface AppProps {
  store: ConnectStore;
  /** Called by the app once it has mounted, so the controller can wire the Ink exit. */
  registerExit: (exit: () => void) => void;
}

const NEW_AGENT_VALUE = '__new__';

export function App({ store, registerExit }: AppProps): React.ReactElement {
  const phase = useStore(store.phase);
  const { exit } = useApp();

  React.useEffect(() => {
    registerExit(exit);
  }, [exit, registerExit]);

  // Layout pattern: the orb lives at the top of every screen, always
  // breathing/shimmering. Everything else slots beneath it. This gives the
  // CLI a single persistent visual identity instead of a different
  // header/spinner per phase.
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
      <PersistentOrb />
      <PhaseContent phase={phase} />
    </Box>
  );
}

function PhaseContent({ phase }: { phase: ReturnType<ConnectStore['phase']['get']> }): React.ReactElement {
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
      const options = [
        { label: 'Slack (recommended)', value: 'slack' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Email — coming soon', value: 'email' },
        { label: 'WhatsApp — coming soon', value: 'whatsapp' },
        { label: 'Microsoft Teams — coming soon', value: 'teams' },
        { label: 'Skip — set up later in dashboard', value: 'skip' },
      ];

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Pick a channel to connect this agent to</Text>
          <Select
            options={options}
            onChange={(value) => phase.resolve(value as 'slack' | 'email' | 'whatsapp' | 'telegram' | 'teams' | 'skip')}
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

function PersistentOrb(): React.ReactElement {
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

  return <Orb phase={frame} scale={scale} />;
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
 * First screen the user sees. The visible text is held back ~1.5s so the orb
 * has time to play out its entry animation (ENTRY_MS + small breathing
 * pause) before the welcome lands on a fully-formed sphere. Enter is also
 * gated on the text being visible — a fast key-mash during the orb grow-in
 * won't accidentally skip past it.
 */
const WELCOME_REVEAL_MS = 1500;

function WelcomeContent({ onContinue }: { onContinue: () => void }): React.ReactElement {
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setRevealed(true), WELCOME_REVEAL_MS);

    return () => clearTimeout(t);
  }, []);

  useInput((_input, key) => {
    if (!revealed) return;
    if (key.return || _input === ' ') onContinue();
  });

  if (!revealed) {
    // Render an empty box so the layout doesn't jump when the text appears.
    return <Box />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Welcome to Novu Connect</Text>
      <Text dimColor>Spin up a managed AI agent and connect it to your team — all from your terminal.</Text>
      <Text color="cyan">Press Enter to sign in or create an account →</Text>
    </Box>
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

function Orb({ phase, scale }: { phase: number; scale: number }): React.ReactElement {
  const rows: React.ReactElement[] = [];
  for (let row = 0; row < TERM_H; row++) {
    let line = '';
    for (let col = 0; col < TERM_W; col++) {
      const baseX = col * 2;
      const baseY = row * 4;
      let code = 0x2800;
      for (const dot of BRAILLE_BITS) {
        if (samplePixel(baseX + dot.dx, baseY + dot.dy, phase, scale)) {
          code |= dot.bit;
        }
      }
      line += String.fromCharCode(code);
    }
    rows.push(
      <Text key={row} color="white">
        {line}
      </Text>
    );
  }

  return <Box flexDirection="column">{rows}</Box>;
}

function samplePixel(px: number, py: number, phase: number, scale: number): boolean {
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
    const intensity = Math.min(1, lambert * 0.85 + spec + 0.04);

    const threshold = BAYER_8[py & 7][px & 7] / 64;

    return intensity > threshold;
  }

  // Outside the sphere — sparse, stable starfield. Phase-independent so
  // stars don't twitch behind a steady sphere. Visible from frame 0 so the
  // canvas isn't empty during the orb's entry animation.
  const starSeed = (px * 137 + py * 211) % 4001;
  if (starSeed === 0) return true;
  if (starSeed === 1117) return true;
  if (starSeed === 2531) return true;
  if (starSeed === 3203) return true;

  return false;
}
