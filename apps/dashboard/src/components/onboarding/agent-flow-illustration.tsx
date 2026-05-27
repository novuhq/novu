import { AnimatePresence, motion } from 'motion/react';
import { RiCodeSSlashLine } from 'react-icons/ri';
import { SiWhatsapp } from 'react-icons/si';
import { AnthropicAsteriskIcon } from './agent-flow-illustration-shared';
import { ClaudeAgentPreviewIllustration, type ClaudeAgentPreviewProps } from './claude-agent-preview-illustration';

const SLACK_ICON = '/images/providers/light/square/slack.svg';
const MS_TEAMS_ICON = '/images/providers/light/square/msteams.svg';
const NOVU_ICON = '/images/novu.svg';

export type AgentFlowState = 'connect' | 'details' | 'connected';
export type AgentFlowRuntime = 'claude' | 'scratch';

export type ManagedAgentPreview = Omit<ClaudeAgentPreviewProps, 'status'> & {
  /**
   * When true, the in-flight prompt generation or agent creation request is happening — the
   * preview shows the "CONNECTING ..." badge even though the runtime hasn't transitioned to
   * the `details` phase yet.
   */
  isPending: boolean;
};

type AgentFlowIllustrationProps = {
  state: AgentFlowState;
  runtime: AgentFlowRuntime;
  /**
   * Required when `runtime === 'claude'`; ignored otherwise. Encapsulates the data needed by
   * the managed-Claude preview card (connector icon, demo flag, name/instructions/mcps/tools).
   */
  managedPreview?: ManagedAgentPreview;
};

const TRANSITION = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };
const DIMMED = 0.25;

function resolveManagedStatus(
  state: AgentFlowState,
  isAgentCreated: boolean,
  isPending: boolean
): ClaudeAgentPreviewProps['status'] {
  if (isAgentCreated) return 'connected';
  if (state === 'details' || isPending) return 'connecting';

  return 'idle';
}

type IllustrationVariant = 'scratch' | 'managed' | 'claude';

function resolveVariant(
  runtime: AgentFlowRuntime,
  managedPreview: ManagedAgentPreview | undefined
): IllustrationVariant {
  if (runtime === 'scratch') return 'scratch';
  if (managedPreview) return 'managed';

  return 'claude';
}

function renderVariant(
  variant: IllustrationVariant,
  state: AgentFlowState,
  managedPreview: ManagedAgentPreview | undefined
) {
  switch (variant) {
    case 'scratch':
      return <ScratchAgentFlowIllustration state={state} />;
    case 'managed': {
      if (!managedPreview) return null;
      const { isPending, agentCreated: isAgentCreated, ...rest } = managedPreview;

      return (
        <ClaudeAgentPreviewIllustration
          {...rest}
          status={resolveManagedStatus(state, isAgentCreated, isPending)}
          agentCreated={isAgentCreated}
        />
      );
    }
    case 'claude':
      return <ClaudeAgentFlowIllustration state={state} />;
  }
}

const VARIANT_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
} as const;

export function AgentFlowIllustration({ state, runtime, managedPreview }: AgentFlowIllustrationProps) {
  const variant = resolveVariant(runtime, managedPreview);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={variant}
        initial={VARIANT_MOTION.initial}
        animate={VARIANT_MOTION.animate}
        exit={VARIANT_MOTION.exit}
        transition={TRANSITION}
      >
        {renderVariant(variant, state, managedPreview)}
      </motion.div>
    </AnimatePresence>
  );
}

type VariantProps = {
  state: AgentFlowState;
};

function ClaudeAgentFlowIllustration({ state }: VariantProps) {
  const isAgentLive = state !== 'connect';
  const isChannelConnected = state === 'connected';

  const middleOpacity = state === 'connect' ? DIMMED : 1;
  const providersOpacity = state === 'connected' ? 1 : DIMMED;

  return (
    <Frame>
      <SectionGroup>
        <SectionHeader
          number="01"
          title="YOUR AGENT BRAIN"
          trailing={<ConnectionBadge connected={isAgentLive} connectedLabel="CONNECTED" />}
        />
        <AgentBrainCard withBrandIcon />
      </SectionGroup>

      <ConnectorRow
        pairs={1}
        pills={{ left: { label: 'CONTEXT ↑', tone: 'brand' }, right: { label: 'REPLY ↓', tone: 'muted' } }}
      />

      <SectionGroup opacity={middleOpacity} className="pt-5">
        <SectionHeader number="02" title="NOVU HANDLES THE PLUMBING" />
        <AgentPlumbingCard title="Agent connector" />
      </SectionGroup>

      <SectionGroup opacity={middleOpacity}>
        <div className="flex flex-col items-center">
          <ConnectorRow />
          <PostWebhookPill />
          <ConnectorRow />
        </div>
      </SectionGroup>

      <SectionGroup opacity={providersOpacity} className="pt-5">
        <SectionHeader
          number="03"
          title="USER SENDS A MESSAGE"
          trailing={
            <FadeInBadge show={isChannelConnected}>
              <LiveBadge label="CONNECTED" />
            </FadeInBadge>
          }
        />
        <ProvidersRow channelConnected={isChannelConnected} />
      </SectionGroup>
    </Frame>
  );
}

function ScratchAgentFlowIllustration({ state }: VariantProps) {
  const isLive = state === 'connected';
  const middleOpacity = state === 'connect' ? DIMMED : 1;
  const brainOpacity = state === 'connected' ? 1 : DIMMED;

  return (
    <Frame>
      <SectionGroup>
        <SectionHeader
          number="01"
          title="SUBSCRIBER SENDS A MESSAGE"
          trailing={
            <FadeInBadge show={isLive}>
              <LiveBadge label="LIVE" />
            </FadeInBadge>
          }
        />
        <ProvidersRow channelConnected={isLive} />
      </SectionGroup>

      <SectionGroup opacity={middleOpacity}>
        <div className="flex flex-col items-center">
          <ConnectorRow />
          <PostWebhookPill />
          <ConnectorRow />
        </div>
      </SectionGroup>

      <SectionGroup opacity={middleOpacity} className="pt-5">
        <SectionHeader number="02" title="NOVU HANDLES THE PLUMBING" />
        <AgentPlumbingCard title="Agent runtime" />
      </SectionGroup>

      <SectionGroup opacity={middleOpacity}>
        <ConnectorRow
          pairs={1}
          pills={{ left: { label: 'CONTEXT ↓', tone: 'brand' }, right: { label: 'REPLY ↑', tone: 'muted' } }}
        />
      </SectionGroup>

      <SectionGroup opacity={brainOpacity} className="pt-5">
        <SectionHeader number="03" title="YOUR AGENT BRAIN" />
        <AgentBrainCard />
      </SectionGroup>
    </Frame>
  );
}

type FrameProps = {
  children: React.ReactNode;
};

function Frame({ children }: FrameProps) {
  return <div className="font-mono flex w-[303px] flex-col items-stretch">{children}</div>;
}

type SectionGroupProps = {
  children: React.ReactNode;
  opacity?: number;
  className?: string;
};

function SectionGroup({ children, opacity = 1, className }: SectionGroupProps) {
  const isDim = opacity < 1;

  return (
    <motion.div
      // Layer a subtle Y nudge on top of the opacity so dim sections feel like they "settle"
      // into place when they activate, matching the rise-in motion used at the variant level.
      animate={{ opacity, y: isDim ? 2 : 0 }}
      transition={TRANSITION}
      className={`flex flex-col gap-3 ${className ?? ''}`.trim()}
    >
      {children}
    </motion.div>
  );
}

type SectionHeaderProps = {
  number: '01' | '02' | '03';
  title: string;
  trailing?: React.ReactNode;
};

function SectionHeader({ number, title, trailing }: SectionHeaderProps) {
  return (
    <div className="flex h-4 items-center gap-2.5">
      <div className="flex flex-1 items-center gap-1 overflow-hidden">
        <span className="text-text-soft text-[10px] font-medium uppercase leading-[14px] tracking-[0.4px]">
          {number}
        </span>
        <span className="text-text-strong truncate text-[10px] font-medium uppercase leading-[14px] tracking-[0.8px]">
          {title}
        </span>
      </div>
      {trailing}
    </div>
  );
}

type FadeInBadgeProps = {
  show: boolean;
  children: React.ReactNode;
};

function FadeInBadge({ show, children }: FadeInBadgeProps) {
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          key="badge"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={TRANSITION}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type ConnectionBadgeProps = {
  connected: boolean;
  connectedLabel: string;
};

function ConnectionBadge({ connected, connectedLabel }: ConnectionBadgeProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {connected ? (
        <motion.div
          key="connected"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={TRANSITION}
        >
          <LiveBadge label={connectedLabel} />
        </motion.div>
      ) : (
        <motion.div
          key="not-connected"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={TRANSITION}
        >
          <NotConnectedBadge />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NotConnectedBadge() {
  return (
    <span className="bg-bg-weak inline-flex items-center gap-1.5 rounded-full px-1.5 py-[2px]">
      <span className="bg-text-soft inline-block size-[5px] rounded-full" />
      <span className="text-text-soft text-[9px] font-medium uppercase leading-3 tracking-[0.54px]">NOT CONNECTED</span>
    </span>
  );
}

type LiveBadgeProps = {
  label: string;
};

function LiveBadge({ label }: LiveBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e0faec] px-1.5 py-[2px]">
      <motion.span
        animate={{ opacity: [1, 0.55, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="relative inline-block size-[5px] rounded-full bg-[#1fc16b] shadow-[0_0_0_2px_rgba(31,193,107,0.18)]"
      />
      <span className="text-[9px] font-medium uppercase leading-3 tracking-[0.54px] text-[#1fc16b]">{label}</span>
    </span>
  );
}

type AgentBrainCardProps = {
  withBrandIcon?: boolean;
};

function AgentBrainCard({ withBrandIcon = false }: AgentBrainCardProps) {
  return (
    <div className="border-stroke-soft relative rounded-lg border p-1">
      <div className="border-stroke-soft bg-bg-white flex h-[31px] items-center gap-1.5 rounded-[4px] border px-2">
        {withBrandIcon ? (
          <AnthropicAsteriskIcon className="size-[14px] shrink-0" />
        ) : (
          <RiCodeSSlashLine className="text-text-soft size-3 shrink-0" aria-hidden />
        )}
        <div className="flex flex-1 flex-wrap items-start gap-[3px_2px]">
          <span className="h-[5px] w-[105px] rounded-full bg-linear-to-r from-[#f1efef] via-[#f9f8f8] to-[rgba(249,248,248,0.75)]" />
          <span className="h-[6px] w-[48px] rounded-full bg-linear-to-r from-[#f1efef] via-[#f9f8f8] to-[rgba(249,248,248,0.75)]" />
          <span className="h-[5px] w-[103px] rounded-full bg-linear-to-r from-[#f1efef] via-[#f9f8f8] to-[rgba(249,248,248,0.75)]" />
          <span className="h-[5px] w-[58px] rounded-full bg-linear-to-r from-[#f1efef] via-[#f9f8f8] to-[rgba(249,248,248,0.75)]" />
          <span className="h-[5px] w-[58px] rounded-full bg-linear-to-r from-[#f1efef] via-[#f9f8f8] to-[rgba(249,248,248,0.75)]" />
        </div>
      </div>
      <span className="border-stroke-soft bg-bg-white absolute -top-[6px] right-[12px] inline-flex items-center justify-center rounded border px-1 py-[2px] text-[9px] font-medium uppercase leading-4 tracking-[-0.06px]">
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(90.88deg, rgb(147, 146, 146) 0.21%, rgb(100, 100, 100) 99.79%)',
          }}
        >
          YOUR AGENT
        </span>
      </span>
    </div>
  );
}

type PillTone = 'brand' | 'muted';
type Pill = { label: string; tone: PillTone };

type ConnectorRowProps = {
  pills?: { left: Pill; right: Pill };
  pairs?: 1 | 3;
};

const PAIR_LAYOUTS: Record<NonNullable<ConnectorRowProps['pairs']>, readonly string[]> = {
  1: ['center'],
  3: ['left', 'center', 'right'],
} as const;

function ConnectorRow({ pills, pairs = 3 }: ConnectorRowProps) {
  const positions = PAIR_LAYOUTS[pairs];

  return (
    <div className="relative flex w-full items-start justify-center px-10 py-2">
      <div className={`flex w-full items-start ${pairs === 3 ? 'justify-between' : 'justify-center'}`}>
        {positions.map((position) => (
          <ConnectorPair key={position} />
        ))}
      </div>
      {pills ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-[50px]">
          <div className="flex h-[18px] items-center justify-between">
            <ConnectorPill {...pills.left} />
            <ConnectorPill {...pills.right} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConnectorPill({ label, tone }: Pill) {
  if (tone === 'brand') {
    return (
      <span className="bg-bg-white inline-flex h-[18px] items-center justify-center rounded-full border border-[rgba(249,196,207,0.5)] px-2.5 py-[3px] text-[9px] font-medium uppercase leading-3 tracking-[0.36px] text-[#d91f4a] shadow-[0_1px_1px_rgba(221,36,80,0.08)]">
        {label}
      </span>
    );
  }

  return (
    <span className="bg-bg-white text-text-soft inline-flex h-[18px] items-center justify-center rounded-full border border-[rgba(225,228,234,0.5)] px-2.5 py-[3px] text-[9px] font-medium uppercase leading-3 tracking-[0.36px]">
      {label}
    </span>
  );
}

function ConnectorPair() {
  return (
    <div className="flex items-stretch gap-1">
      <ConnectorLine direction="down" />
      <ConnectorLine direction="up" />
    </div>
  );
}

type ConnectorLineProps = {
  direction: 'up' | 'down';
};

function ConnectorLine({ direction }: ConnectorLineProps) {
  return (
    <div className="relative flex h-[34px] w-[5px] items-center justify-center">
      <div className="bg-stroke-soft h-full w-px" />
      <span
        className={`bg-stroke-soft absolute left-1/2 size-[3px] -translate-x-1/2 rounded-full ${
          direction === 'down' ? 'top-1' : 'bottom-1'
        }`}
      />
    </div>
  );
}

type AgentPlumbingCardProps = {
  title: string;
};

function AgentPlumbingCard({ title }: AgentPlumbingCardProps) {
  const tags = ['CONVERSATION HISTORY', 'IDENTITY', 'PREFERENCES', 'ANALYTICS', 'WEBHOOK INGESTION', 'OBSERVABILITY'];

  return (
    <div className="border-stroke-soft bg-bg-white flex flex-col gap-2 rounded-lg border px-2 py-2 shadow-[0_1px_1px_rgba(16,24,40,0.02)]">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded">
          <img src={NOVU_ICON} alt="" className="size-3" />
        </span>
        <span
          className="text-text-sub text-xs font-medium leading-4 tracking-[-0.06px]"
          style={{ fontFamily: 'Inter' }}
        >
          {title}
        </span>
      </div>
      <div className="bg-stroke-soft h-px w-full" />
      <div className="flex flex-wrap items-center gap-[6px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-bg-weak border-stroke-soft text-text-soft inline-flex items-center rounded border px-[7px] py-1 text-[10px] font-medium uppercase leading-none tracking-[-0.06px]"
          >
            {tag.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function PostWebhookPill() {
  return (
    <div className="bg-bg-white border-stroke-soft text-text-soft flex h-[18px] w-[237px] items-center justify-center rounded-full border px-2.5 py-[3px] text-[9px] font-medium uppercase leading-3 tracking-[0.36px]">
      POST /WEBHOOK
    </div>
  );
}

type ProvidersRowProps = {
  channelConnected: boolean;
};

function ProvidersRow({ channelConnected }: ProvidersRowProps) {
  return (
    <div className="bg-bg-weak flex h-[36px] items-stretch gap-[3px] rounded-xl p-[2px]">
      <ProviderCard
        name="Slack"
        icon={<img src={SLACK_ICON} alt="" className="size-[14px]" />}
        rotate="-rotate-1"
        showConnectedIndicator={channelConnected}
      />
      <ProviderCard
        name="WhatsApp"
        icon={<SiWhatsapp className="size-[14px] text-[#25D366]" aria-hidden />}
        rotate="rotate-1"
      />
      <ProviderCard name="Teams" icon={<img src={MS_TEAMS_ICON} alt="" className="size-[14px]" />} rotate="rotate-1" />
    </div>
  );
}

type ProviderCardProps = {
  name: string;
  icon: React.ReactNode;
  rotate: '-rotate-1' | 'rotate-1';
  showConnectedIndicator?: boolean;
};

function ProviderCard({ name, icon, rotate, showConnectedIndicator = false }: ProviderCardProps) {
  return (
    <div className="border-stroke-soft flex flex-1 items-center justify-center rounded-lg border p-[3px]">
      <div className="border-stroke-soft bg-bg-white relative flex h-[26px] w-full items-center justify-center gap-1 rounded-[4px] border px-1.5">
        <span className={`flex shrink-0 items-center justify-center ${rotate}`}>{icon}</span>
        <span
          className="text-text-sub text-[11px] font-medium leading-[11px] tracking-[-0.055px]"
          style={{ fontFamily: 'Inter' }}
        >
          {name}
        </span>
        <AnimatePresence>
          {showConnectedIndicator ? (
            <motion.span
              key="dot"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={TRANSITION}
              className="absolute right-1 top-1/2 inline-flex size-[10px] -translate-y-1/2 items-center justify-center rounded-full bg-[#e0faec]"
            >
              <span className="size-[5px] rounded-full bg-[#1fc16b]" />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
