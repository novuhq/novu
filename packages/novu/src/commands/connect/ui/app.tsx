import { Select, TextInput } from '@inkjs/ui';
import { AWS_CLAUDE_COMMERCIAL_REGIONS } from '@novu/shared';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { GeneratedAgentSpec } from '../api/agents';
import { channelDisplayName, isDashboardOnlyChannel } from '../dashboard-urls';
import type { AgentRuntimeChoice, ChannelChoice } from '../types';
import { resolveGeneratedAgentSpecLabels, wrapPreviewLines } from './agent-spec-labels';
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
const PREVIEW_ORB_COLOR = '#c084fc';
/** Orb morph duration when the generated agent preview lands. */
const PREVIEW_MORPH_MS = 2000;

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
const NEW_INTEGRATION_VALUE = '__new_integration__';

export function App({ store, registerExit }: AppProps): React.ReactElement {
  const phase = useStore(store.phase);
  const { exit } = useApp();

  // Tracks which channel the user is hovering in the picker, so the orb can
  // tint to that brand colour before they commit. Reset to `null` when we
  // leave the picker — the channel-specific phases below derive their tint
  // directly from the phase kind.
  const [hoveredChannel, setHoveredChannel] = React.useState<ChannelChoice | null>(null);
  const [previewMorphProgress, setPreviewMorphProgress] = React.useState<number | null>(null);
  const previousPhaseKindRef = React.useRef(phase.kind);

  React.useEffect(() => {
    registerExit(exit);
  }, [exit, registerExit]);

  React.useEffect(() => {
    if (phase.kind !== 'preview-generated') {
      setPreviewMorphProgress(null);
      previousPhaseKindRef.current = phase.kind;

      return;
    }

    const enteringPreview = previousPhaseKindRef.current !== 'preview-generated';
    previousPhaseKindRef.current = phase.kind;

    if (!enteringPreview) {
      return;
    }

    const morphStartedAt = Date.now();
    setPreviewMorphProgress(0);

    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - morphStartedAt) / PREVIEW_MORPH_MS);
      setPreviewMorphProgress(progress);

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, ORB_FRAME_MS);

    return () => clearInterval(timer);
  }, [phase.kind]);

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

  const tintColor = computeOrbTint(phase, hoveredChannel, previewMorphProgress);
  const label = computeOrbLabel(phase, hoveredChannel);
  const previewMorphComplete = previewMorphProgress === null ? false : previewMorphProgress >= 1;

  // Layout pattern: the orb lives at the top of every screen, always
  // breathing/shimmering. Everything else slots beneath it, horizontally
  // centered so the welcome text / phase content / QR codes all line up
  // visually with the orb's center. Single persistent visual identity
  // instead of a different header/spinner per phase.
  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} gap={1} alignItems="center">
      <PersistentOrb
        tintColor={tintColor}
        label={label}
        previewMorphProgress={phase.kind === 'preview-generated' ? previewMorphProgress : null}
      />
      <PhaseContent
        phase={phase}
        onChannelHover={setHoveredChannel}
        previewMorphComplete={previewMorphComplete}
      />
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
  hoveredChannel: ChannelChoice | null,
  previewMorphProgress: number | null
): string {
  switch (phase.kind) {
    case 'pick-channel':
      return hoveredChannel ? CHANNEL_TINTS[hoveredChannel] : DEFAULT_ORB_COLOR;
    case 'adding-slack':
    case 'paste-slack-token':
    case 'running-slack-quick-setup':
    case 'slack-oauth-ready':
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
    case 'dashboard-channel-ready':
      return CHANNEL_TINTS[phase.channel];
    case 'success': {
      const activeChannel = phase.connectedChannel ?? phase.dashboardRedirectChannel;

      return activeChannel ? CHANNEL_TINTS[activeChannel] : DEFAULT_ORB_COLOR;
    }
    case 'generating':
      return DEFAULT_ORB_COLOR;
    case 'preview-generated': {
      const morph = previewMorphProgress ?? 0;

      return lerpHexColor(DEFAULT_ORB_COLOR, PREVIEW_ORB_COLOR, morph);
    }
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
    case 'slack-oauth-ready':
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
    case 'dashboard-channel-ready':
      return CHANNEL_LABELS[phase.channel];
    case 'success': {
      const activeChannel = phase.connectedChannel ?? phase.dashboardRedirectChannel;

      return activeChannel ? CHANNEL_LABELS[activeChannel] : undefined;
    }
    default:
      return undefined;
  }
}

function PhaseContent({
  phase,
  onChannelHover,
  previewMorphComplete,
}: {
  phase: ReturnType<ConnectStore['phase']['get']>;
  onChannelHover: (channel: ChannelChoice | null) => void;
  previewMorphComplete: boolean;
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
      return <Text color="cyan">Looking up agent runtime integrations…</Text>;

    case 'pick-runtime':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Where do you want the agent to run?</Text>
          <Text dimColor>Choose the agent runtime. Novu connects it to Slack, email, and more.</Text>
          <RuntimeSelect onChange={(value) => phase.resolve(value)} />
        </Box>
      );

    case 'pick-integration': {
      const options = [
        ...phase.integrations.map((integration) => ({
          label: `${integration.name} (${integration.identifier})`,
          value: integration._id,
        })),
        { label: '+ Set up new credentials', value: NEW_INTEGRATION_VALUE },
      ];

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{`Select a ${phase.providerLabel} integration`}</Text>
          <Text dimColor>Reuse saved credentials or add new ones for this run.</Text>
          <Select
            options={options}
            onChange={(value) => {
              if (value === NEW_INTEGRATION_VALUE) {
                phase.resolve({ kind: 'new' });

                return;
              }

              phase.resolve({ kind: 'existing', integrationId: value });
            }}
          />
        </Box>
      );
    }

    case 'prompt-secret':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>{phase.title}</Text>
          {phase.hint ? <Text dimColor>{phase.hint}</Text> : null}
          <Box borderStyle="round" paddingX={1}>
            <TextInput placeholder={phase.placeholder} onSubmit={(value) => phase.resolve(value)} />
          </Box>
          <Text dimColor>Press Enter to submit.</Text>
        </Box>
      );

    case 'pick-aws-region': {
      const options = AWS_CLAUDE_COMMERCIAL_REGIONS.map((region) => ({
        label: region,
        value: region,
      }));

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>AWS Claude region</Text>
          <Text dimColor>Select the commercial region for your AWS Claude Platform workspace.</Text>
          <Select options={options} onChange={(value) => phase.resolve(value)} />
        </Box>
      );
    }

    case 'verifying-credentials':
      return <Text color="cyan">Verifying credentials…</Text>;

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
          <Text bold>{phase.previousPrompt ? 'Refine your description' : 'Describe your agent'}</Text>
          {phase.previousPrompt ? (
            <Text dimColor>{`Previous: "${truncateInline(phase.previousPrompt, 72)}"`}</Text>
          ) : null}
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

    case 'preview-generated':
      return (
        <PreviewGeneratedContent spec={phase.spec} onAction={phase.resolve} morphComplete={previewMorphComplete} />
      );

    case 'creating':
      return <Text color="cyan">{`Creating agent "${phase.name}"…`}</Text>;

    case 'pick-channel': {
      const options: Array<{ label: string; value: ChannelChoice }> = [
        { label: 'Slack (recommended)', value: 'slack' },
        { label: 'Telegram', value: 'telegram' },
        { label: 'Email', value: 'email' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Microsoft Teams', value: 'teams' },
        { label: 'Skip — set up later in dashboard', value: 'skip' },
      ];

      return (
        <Box flexDirection="column" gap={1} width={CHANNEL_PICKER_WIDTH}>
          <Text bold wrap="wrap">
            Pick a channel to connect this agent to
          </Text>
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
            <Text dimColor>1. Open </Text>
            <Text color="cyan">https://api.slack.com/apps</Text>
            <Text dimColor>2. Scroll to the bottom of the page</Text>
            <Text dimColor>3. Generate an App Configuration Token</Text>
            <Text dimColor>4. Copy the access token (starts with xoxe.xoxp-)</Text>
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

    case 'slack-oauth-ready':
      return (
        <SlackOAuthReadyContent
          appCreated={phase.appCreated}
          authorizeUrl={phase.authorizeUrl}
          onContinue={phase.resolve}
        />
      );

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

    case 'dashboard-channel-ready':
      return (
        <DashboardChannelReadyContent
          channel={phase.channel}
          agentDetailsUrl={phase.agentDetailsUrl}
          onContinue={phase.resolve}
        />
      );

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
  previewMorphProgress,
}: {
  tintColor: string;
  label: string | undefined;
  previewMorphProgress: number | null;
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
  const morphProgress = previewMorphProgress ?? 1;

  return (
    <Orb phase={frame} scale={scale} tintColor={tintColor} label={label} morphProgress={morphProgress} />
  );
}

/**
 * Channel picker that emits `onHighlight` as the user arrows up/down so the
 * orb can react in real time. `@inkjs/ui`'s built-in Select fires only on
 * final commit, which is too late for our purposes.
 */
function RuntimeSelect({
  onChange,
}: {
  onChange: (value: AgentRuntimeChoice) => void;
}): React.ReactElement {
  const options: Array<{ value: AgentRuntimeChoice; title: string; detail?: string }> = [
    { value: 'demo', title: 'Novu Demo Agent', detail: '10 conversations per month' },
    { value: 'claude', title: 'Claude Managed Agents - BYOK' },
    { value: 'claude-aws', title: 'Claude Managed Agents on AWS' },
  ];
  const [idx, setIdx] = React.useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setIdx((current) => (current - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setIdx((current) => (current + 1) % options.length);
    } else if (key.return) {
      onChange(options[idx].value);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, i) => {
        const isSelected = i === idx;

        return (
          <Text key={opt.value}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '› ' : '  '}
              {opt.title}
            </Text>
            {opt.detail ? <Text dimColor>{` · ${opt.detail}`}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}

const DASHBOARD_CHANNEL_HINT =
  'Onboarding for this channel is currently only available in the Novu Connect UI.';
/** Keeps the picker + hint from widening the centered layout when the hint appears. */
const CHANNEL_PICKER_WIDTH = 48;

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

  const highlighted = options[idx]?.value ?? null;
  const showDashboardHint = highlighted !== null && isDashboardOnlyChannel(highlighted);

  return (
    <Box flexDirection="column" gap={1} width={CHANNEL_PICKER_WIDTH}>
      <Box flexDirection="column">
        {options.map((opt, i) => {
          const isSelected = i === idx;
          const opensInDashboard = isDashboardOnlyChannel(opt.value);

          return (
            <Text key={opt.value}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '› ' : '  '}
                {opt.label}
              </Text>
              {opensInDashboard ? <Text dimColor>{isSelected ? ' ↗' : '  ↗'}</Text> : null}
            </Text>
          );
        })}
      </Box>
      <Box flexDirection="column" width={CHANNEL_PICKER_WIDTH}>
        {showDashboardHint ? (
          <Text dimColor wrap="wrap">
            {DASHBOARD_CHANNEL_HINT}
          </Text>
        ) : (
          <>
            <Text> </Text>
            <Text> </Text>
          </>
        )}
      </Box>
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
          <Text color="cyan">Press Enter to sign in or create an account →</Text>
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

type PreviewMenuAction = 'confirm' | 'refine';

function PreviewGeneratedContent({
  spec,
  onAction,
  morphComplete,
}: {
  spec: GeneratedAgentSpec;
  onAction: (action: PreviewMenuAction) => void;
  morphComplete: boolean;
}): React.ReactElement {
  const { stdout } = useStdout();
  const [menuIdx, setMenuIdx] = React.useState(0);
  const labels = React.useMemo(() => resolveGeneratedAgentSpecLabels(spec), [spec]);
  const contentWidth = Math.max(48, Math.min(72, stdout.columns - 6));
  const promptWrap = React.useMemo(
    () => wrapPreviewLines(spec.systemPrompt, contentWidth - 4, 5),
    [contentWidth, spec.systemPrompt]
  );

  const menuOptions: Array<{ action: PreviewMenuAction; label: string; hint?: string }> = [
    { action: 'confirm', label: 'Create this agent', hint: '→' },
    { action: 'refine', label: 'Refine my description', hint: '↺' },
  ];

  useInput((_input, key) => {
    if (!morphComplete) return;

    if (key.upArrow) {
      setMenuIdx((current) => (current - 1 + menuOptions.length) % menuOptions.length);
    } else if (key.downArrow) {
      setMenuIdx((current) => (current + 1) % menuOptions.length);
    } else if (key.return || _input === ' ') {
      onAction(menuOptions[menuIdx].action);
    }
  });

  const toolLine = formatCapabilityLine(labels.tools);
  const mcpLine = formatCapabilityLine(labels.mcpServers);
  const skillLine = formatCapabilityLine(labels.skills);

  if (!morphComplete) {
    return (
      <Box flexDirection="column" alignItems="center">
        <Text dimColor>Shaping your agent…</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} width={contentWidth} alignItems="flex-start">
      <Text bold color="#e9d5ff">
        Your agent, shaped
      </Text>
      <Box flexDirection="column" gap={0}>
        <Text bold>{spec.name}</Text>
        <Text dimColor>{spec.identifier}</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Text dimColor>System prompt</Text>
        <Box borderStyle="round" borderColor="#6b7280" paddingX={1} flexDirection="column">
          {promptWrap.lines.map((line, index) => (
            <Text key={`${index}-${line}`} dimColor>
              {line}
            </Text>
          ))}
          {promptWrap.truncated ? <Text dimColor>… editable in the dashboard after creation</Text> : null}
        </Box>
      </Box>

      <Box flexDirection="column" gap={0}>
        {toolLine ? (
          <Text>
            <Text color="#c084fc">Tools</Text>
            <Text dimColor>{` · ${toolLine}`}</Text>
          </Text>
        ) : null}
        {mcpLine ? (
          <Text>
            <Text color="#c084fc">MCP</Text>
            <Text dimColor>{` · ${mcpLine}`}</Text>
          </Text>
        ) : null}
        {skillLine ? (
          <Text>
            <Text color="#c084fc">Skills</Text>
            <Text dimColor>{` · ${skillLine}`}</Text>
          </Text>
        ) : null}
        {!toolLine && !mcpLine && !skillLine ? (
          <Text dimColor>No extra tools wired — web search is enabled by default.</Text>
        ) : null}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {menuOptions.map((opt, i) => {
          const isSelected = i === menuIdx;

          return (
            <Text key={opt.action}>
              <Text color={isSelected ? 'cyan' : undefined}>
                {isSelected ? '› ' : '  '}
                {opt.label}
              </Text>
              {isSelected && opt.hint ? <Text dimColor>{` ${opt.hint}`}</Text> : null}
            </Text>
          );
        })}
        <Text dimColor>↑↓ choose · Enter confirm</Text>
      </Box>
    </Box>
  );
}

function formatCapabilityLine(items: string[]): string | null {
  if (items.length === 0) return null;

  return items.join(', ');
}

function truncateInline(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 1)}…`;
}

function lerpHexColor(from: string, to: string, amount: number): string {
  const clamped = Math.min(1, Math.max(0, amount));
  const fromRgb = parseHexColor(from);
  const toRgb = parseHexColor(to);
  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * clamped);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * clamped);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * clamped);

  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function SlackOAuthReadyContent({
  appCreated,
  authorizeUrl,
  onContinue,
}: {
  appCreated: boolean;
  authorizeUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  return (
    <Box flexDirection="column" gap={1}>
      {appCreated ? (
        <>
          <Text bold color="green">
            Slack app created successfully
          </Text>
          <Text dimColor>
            Novu created a Slack app for your agent. Next, add it to your workspace so your team can talk to the agent
            in Slack.
          </Text>
        </>
      ) : (
        <>
          <Text bold color="cyan">
            Connect Slack to your agent
          </Text>
          <Text dimColor>Authorize Novu to install the Slack app in your workspace.</Text>
        </>
      )}
      <Text dimColor>{`OAuth link: ${authorizeUrl.slice(0, 80)}${authorizeUrl.length > 80 ? '…' : ''}`}</Text>
      <Text color="cyan">Press Enter to open Slack and add the app to your workspace →</Text>
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

function DashboardChannelReadyContent({
  channel,
  agentDetailsUrl,
  onContinue,
}: {
  channel: ChannelChoice;
  agentDetailsUrl: string;
  onContinue: () => void;
}): React.ReactElement {
  useInput((_input, key) => {
    if (key.return || _input === ' ') onContinue();
  });

  const channelLabel = channelDisplayName(channel);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Continue in Novu Connect</Text>
      <Text dimColor>
        {channelLabel} setup is not available in the CLI yet. Press Enter to open your agent in Novu Connect and finish
        connecting there.
      </Text>
      <Text color="cyan">{agentDetailsUrl}</Text>
      <Text dimColor>Press Enter to open Novu Connect →</Text>
    </Box>
  );
}

function SuccessView({
  phase,
}: {
  phase: Extract<ReturnType<ConnectStore['phase']['get']>, { kind: 'success' }>;
}): React.ReactElement {
  const { agent, connectDashboardUrl, environmentSlug, connectedChannel, dashboardRedirectChannel } = phase;
  const agentUrl = environmentSlug
    ? `${connectDashboardUrl}/env/${environmentSlug}/connect/agents/${encodeURIComponent(agent.identifier)}`
    : `${connectDashboardUrl}/connect/agents/${encodeURIComponent(agent.identifier)}`;

  const channelLabel = (() => {
    if (connectedChannel === 'slack') return 'Slack';
    if (connectedChannel === 'telegram') return 'Telegram';
    if (connectedChannel === 'email') return 'Email';

    return null;
  })();
  const redirectChannelLabel = dashboardRedirectChannel ? channelDisplayName(dashboardRedirectChannel) : null;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Your agent is live.</Text>
      <Box flexDirection="column">
        <Text>
          <Text bold>Agent:</Text> {agent.name} <Text dimColor>({agent.identifier})</Text>
        </Text>
        {channelLabel ? (
          <Text color="cyan">Check {channelLabel} — your agent just messaged you.</Text>
        ) : redirectChannelLabel ? (
          <Text color="cyan">Finish {redirectChannelLabel} setup in Novu Connect — we opened it for you.</Text>
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
  morphProgress = 1,
}: {
  phase: number;
  scale: number;
  tintColor: string;
  label: string | undefined;
  morphProgress?: number;
}): React.ReactElement {
  const rows: React.ReactElement[] = [];
  for (let row = 0; row < TERM_H; row++) {
    let line = '';
    for (let col = 0; col < TERM_W; col++) {
      const baseX = col * 2;
      const baseY = row * 4;
      let code = 0x2800;
      for (const dot of BRAILLE_BITS) {
        if (samplePixel(baseX + dot.dx, baseY + dot.dy, phase, scale, label, morphProgress)) {
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
  label: string | undefined,
  morphProgress = 1
): boolean {
  const morphActive = morphProgress < 1;
  const morphRipple = morphActive ? 1 - morphProgress : 0;
  const morphScaleBoost = morphActive ? 0.16 * Math.sin(morphProgress * Math.PI) : 0;
  // Effective radius shrinks with `scale` during the entry animation. At
  // scale=0 the sphere has no radius — every "inside" check fails — and only
  // the starfield is visible. At scale=1 the sphere is full-size.
  const effectiveR = Math.max(0.001, ORB_RADIUS * scale * (1 + morphScaleBoost));
  let sx = (px - PX_CX) / effectiveR;
  let sy = (py - PX_CY) / effectiveR;

  if (morphRipple > 0) {
    sx += morphRipple * 0.08 * Math.sin(py * 0.22 + phase * 0.3);
    sy += morphRipple * 0.08 * Math.cos(px * 0.22 - phase * 0.25);
  }

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
    const spec = Math.pow(lambert, 12) * (0.35 + morphRipple * 0.3);

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
    const ambientActivation = Math.max(0, Math.min(1, (phase - WISP_DELAY_FRAMES) / WISP_FADE_FRAMES));
    const activation = Math.max(morphRipple * 0.9, ambientActivation);
    if (activation > 0) {
      const d = Math.sqrt(r2);
      const WISP_REACH = 0.22 + morphRipple * 0.2;
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
