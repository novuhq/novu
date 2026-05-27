import { Select, Spinner, TextInput } from '@inkjs/ui';
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

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1}>
      <Header />
      {renderPhase(phase)}
    </Box>
  );
}

function renderPhase(phase: ReturnType<ConnectStore['phase']['get']>): React.ReactElement {
  switch (phase.kind) {
    case 'auth':
      return (
        <Box flexDirection="column" gap={1}>
          <SpinnerLine label={phase.status} />
          {phase.dashboardUrl ? (
            <Box flexDirection="column">
              <Text dimColor>If your browser didn't open, visit:</Text>
              <Text color="cyan">{phase.dashboardUrl}</Text>
            </Box>
          ) : null}
        </Box>
      );

    case 'listing-agents':
      return <SpinnerLine label="Checking for existing agents…" />;

    case 'loading-integrations':
      return <SpinnerLine label="Looking up managed integrations…" />;

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
          <Text>Describe your agent</Text>
          <Text dimColor>
            e.g. a customer-support agent that books demos and escalates billing questions.
          </Text>
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
      return <GeneratingScreen />;

    case 'creating':
      return <SpinnerLine label={`Creating agent "${phase.name}"…`} />;

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
      return <SpinnerLine label="Linking Slack to your agent…" />;

    case 'paste-slack-token':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Paste a Slack App Configuration Token</Text>
          <Text dimColor>
            Your Slack integration has no OAuth credentials yet. Novu can create the Slack app for you
            from a manifest if you paste a short-lived configuration token.
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
      return <SpinnerLine label="Creating Slack app from manifest…" />;

    case 'waiting-slack':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Authorize Slack to finish setup</Text>
          <Box flexDirection="column">
            <Text dimColor>Opened in your browser. If nothing happened, visit:</Text>
            <Text color="cyan">{phase.authorizeUrl}</Text>
          </Box>
          <SpinnerLine label="Waiting for Slack authorization…" />
        </Box>
      );

    case 'adding-telegram':
      return <SpinnerLine label="Linking Telegram to your agent…" />;

    case 'telegram-intro':
      return <TelegramIntroScreen botfatherQr={phase.botfatherQr} onContinue={phase.resolve} />;

    case 'telegram-link-token':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">
            Step 2 of 3 · Save your bot token
          </Text>
          <Text dimColor>
            Scan with your phone to open a page where you can paste the BotFather token. We'll handle
            registering the webhook for you.
          </Text>
          <Text>{phase.mobileQr}</Text>
          <Box flexDirection="column">
            <Text dimColor>Or open this on your phone:</Text>
            <Text color="cyan">{phase.mobileUrl}</Text>
          </Box>
          <SpinnerLine label="Waiting for your bot token…" />
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
          <SpinnerLine label="Waiting for /start in Telegram…" />
        </Box>
      );

    case 'sending-welcome':
      return <SpinnerLine label="Asking your agent to say hello in Slack…" />;

    case 'success':
      return <SuccessView phase={phase} />;

    case 'error':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="red">✗ {phase.message}</Text>
        </Box>
      );

    default:
      // exhaustive check: TypeScript should narrow phase to `never` here.
      return <Text />;
  }
}

function Header(): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="magenta">
        novu connect
      </Text>
      <Text dimColor>Create a managed agent and connect it to your team — all from your terminal.</Text>
    </Box>
  );
}

function SpinnerLine({ label }: { label: string }): React.ReactElement {
  return (
    <Box gap={1}>
      <Spinner />
      <Text>{label}</Text>
    </Box>
  );
}

function TelegramIntroScreen({
  botfatherQr,
  onContinue,
}: {
  botfatherQr: string;
  onContinue: () => void;
}): React.ReactElement {
  // Any key advances. Most users will press Enter; `return` from useInput's
  // key arg covers that explicitly so the affordance reads cleanly.
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

/**
 * Dithered monochrome braille sphere for the long-running /agents/generate
 * call.
 *
 * Render path:
 *
 * - Virtual pixel buffer is 2× wider and 4× taller than the displayed grid.
 *   Each terminal cell packs eight pixels (2 cols × 4 rows) into a single
 *   Unicode braille character (U+2800–U+28FF), where each pixel maps to one
 *   of the eight dot bits. That gives an effective ~84 × 48 pixel canvas in
 *   only 42 × 12 terminal cells.
 *
 * - Sphere shading is plain Lambert lighting: at each pixel we reconstruct
 *   the sphere's normal from (sx, sy), the implied z = √(1 − r²), and dot
 *   with a light direction that slowly rotates around the vertical axis so
 *   the highlight drifts across the surface.
 *
 * - The continuous brightness signal is thresholded through an 8×8 Bayer
 *   matrix to produce the classic 1-bit ordered-dithered look (Susan Kare
 *   sphere / demoscene). The lit hemisphere shows dense dots, the
 *   terminator dissolves into sparser patterns, the unlit hemisphere is
 *   completely dark.
 *
 * - Background starfield is a sparse pseudo-random scatter of single dots —
 *   stable positions (independent of phase) so the stars don't twitch.
 *
 * - The whole thing renders as one Text per row (one colour), which keeps
 *   Ink's reconciler cheap even at 10 fps.
 */
const PX_W = 84;
const PX_H = 48;
const TERM_W = PX_W / 2;
const TERM_H = PX_H / 4;
const PX_CX = 42;
const PX_CY = 24;
const ORB_RADIUS = 22;
const ORB_FRAME_MS = 100;

// Standard 8×8 Bayer dithering matrix, values 0–63. Lookup is `BAYER_8[y & 7][x & 7] / 64`,
// giving a threshold in [0, 1) that we compare against the pixel's brightness.
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

const TAGLINES: ReadonlyArray<string> = [
  'Listening for your idea…',
  'Tuning the system prompt…',
  'Picking the right tools…',
  'Wiring up MCP servers…',
  'Reaching for Anthropic skills…',
  'Adding finishing sparkles…',
];

function GeneratingScreen(): React.ReactElement {
  const [phase, setPhase] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const startedAt = Date.now();
    const elapsedTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    const frameTimer = setInterval(() => {
      setPhase((p) => p + 1);
    }, ORB_FRAME_MS);

    return () => {
      clearInterval(elapsedTimer);
      clearInterval(frameTimer);
    };
  }, []);

  // Hold each tagline ~3s (≈ 30 frames at 100ms) before rotating.
  const tagline = TAGLINES[Math.floor(phase / 30) % TAGLINES.length];

  return (
    <Box flexDirection="column" alignItems="center" gap={1}>
      <Orb phase={phase} />
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

// Bit positions for each dot in a 2×4 braille cell (column, row in the cell).
// Source: Unicode braille pattern encoding U+2800 + bitmask.
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

function Orb({ phase }: { phase: number }): React.ReactElement {
  const rows: React.ReactElement[] = [];
  for (let row = 0; row < TERM_H; row++) {
    let line = '';
    for (let col = 0; col < TERM_W; col++) {
      const baseX = col * 2;
      const baseY = row * 4;
      let code = 0x2800;
      for (const dot of BRAILLE_BITS) {
        if (samplePixel(baseX + dot.dx, baseY + dot.dy, phase)) {
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

function samplePixel(px: number, py: number, phase: number): boolean {
  // Sphere coordinates in [-1, 1]: anything outside the unit disk is space.
  const sx = (px - PX_CX) / ORB_RADIUS;
  const sy = (py - PX_CY) / ORB_RADIUS;
  const r2 = sx * sx + sy * sy;

  if (r2 < 1) {
    // Reconstruct z from the sphere equation (we're looking at the front
    // hemisphere). That gives us a unit normal at this pixel for shading.
    const sz = Math.sqrt(1 - r2);

    // Light direction: rotating slowly around the vertical axis so the bright
    // pole drifts left-to-right across the sphere. The light is offset
    // slightly downward from straight-on to feel more natural (classic
    // upper-left desk-lamp position drifts to upper-right and back).
    const t = phase * 0.04;
    const lx = Math.cos(t) * 0.65;
    const ly = -0.45;
    const lz = Math.sqrt(Math.max(0.01, 1 - lx * lx - ly * ly));

    const lambert = Math.max(0, sx * lx + sy * ly + sz * lz);

    // Tight specular pass — produces a small bright cluster of dots that
    // tracks the light direction, sells the "smooth glass sphere" feel.
    const spec = Math.pow(lambert, 12) * 0.35;

    // Add a hair of ambient so the unlit side still occasionally lights up a
    // pixel through the dither — keeps the terminator from looking dead.
    const intensity = Math.min(1, lambert * 0.85 + spec + 0.04);

    const threshold = BAYER_8[py & 7][px & 7] / 64;

    return intensity > threshold;
  }

  // Outside the sphere — sparse, stable starfield. Phase-independent so the
  // stars stay put (no twitchy flicker behind a steady sphere).
  const starSeed = (px * 137 + py * 211) % 4001;
  if (starSeed === 0) return true;
  if (starSeed === 1117) return true;
  if (starSeed === 2531) return true;
  if (starSeed === 3203) return true;

  return false;
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
    connectedChannel === 'slack'
      ? 'Slack'
      : connectedChannel === 'telegram'
        ? 'Telegram'
        : null;

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

