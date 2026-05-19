import { AnimatePresence, motion } from 'motion/react';
import { RiCodeSSlashLine } from 'react-icons/ri';
import { SiWhatsapp } from 'react-icons/si';

const SLACK_ICON = '/images/providers/light/square/slack.svg';
const MS_TEAMS_ICON = '/images/providers/light/square/msteams.svg';
const NOVU_ICON = '/images/novu.svg';

export type AgentFlowState = 'connect' | 'details' | 'connected';
export type AgentFlowRuntime = 'claude' | 'scratch';

type AgentFlowIllustrationProps = {
  state: AgentFlowState;
  runtime: AgentFlowRuntime;
};

const TRANSITION = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };
const DIMMED = 0.25;

export function AgentFlowIllustration({ state, runtime }: AgentFlowIllustrationProps) {
  if (runtime === 'scratch') {
    return <ScratchAgentFlowIllustration state={state} />;
  }

  return <ClaudeAgentFlowIllustration state={state} />;
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

      <motion.div animate={{ opacity: middleOpacity }} transition={TRANSITION} className="flex flex-col items-center">
        <ConnectorRow />
        <PostWebhookPill />
        <ConnectorRow />
      </motion.div>

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

      <motion.div animate={{ opacity: middleOpacity }} transition={TRANSITION} className="flex flex-col items-center">
        <ConnectorRow />
        <PostWebhookPill />
        <ConnectorRow />
      </motion.div>

      <SectionGroup opacity={middleOpacity} className="pt-5">
        <SectionHeader number="02" title="NOVU HANDLES THE PLUMBING" />
        <AgentPlumbingCard title="Agent runtime" />
      </SectionGroup>

      <motion.div animate={{ opacity: middleOpacity }} transition={TRANSITION}>
        <ConnectorRow
          pairs={1}
          pills={{ left: { label: 'CONTEXT ↓', tone: 'brand' }, right: { label: 'REPLY ↑', tone: 'muted' } }}
        />
      </motion.div>

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
  return (
    <motion.div
      animate={{ opacity }}
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

type AnthropicAsteriskIconProps = {
  className?: string;
};

function AnthropicAsteriskIcon({ className }: AnthropicAsteriskIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      focusable="false"
    >
      <title>Anthropic</title>
      <path
        d="M3.74684 10.3074L6.50076 8.76322L6.54684 8.62864L6.50076 8.55426L6.36608 8.55426L5.90532 8.52593L4.33165 8.48343L2.96709 8.42676L1.64506 8.35593L1.3119 8.2851L1 7.87427L1.0319 7.66886L1.3119 7.48115L1.71241 7.51657L2.59848 7.57678L3.92759 7.66886L4.89165 7.72553L6.32 7.87427L6.54684 7.87427L6.57873 7.78219L6.50076 7.72553L6.44051 7.66886L5.06532 6.73742L3.57671 5.75285L2.79696 5.18619L2.37519 4.89932L2.16253 4.63015L2.07038 4.04225L2.45316 3.62079L2.96709 3.65621L3.09823 3.69163L3.61924 4.09183L4.73215 4.95244L6.18532 6.02201L6.39797 6.19909L6.48304 6.13888L6.49367 6.09638L6.39797 5.93701L5.60759 4.50974L4.76405 3.05768L4.38835 2.4556L4.28911 2.09436C4.25367 1.94561 4.22886 1.82165 4.22886 1.66937L4.66481 1.07792L4.90582 1L5.48709 1.07792L5.73165 1.29041L6.09316 2.11561L6.67797 3.41538L7.58532 5.18265L7.85114 5.70681L7.99291 6.19201L8.04608 6.34075L8.13823 6.34075L8.13823 6.25576L8.21266 5.26056L8.35089 4.0387L8.48557 2.46623L8.53165 2.02353L8.75139 1.49228L9.18734 1.20541L9.52759 1.36833L9.8076 1.76853L9.76861 2.02707L9.60203 3.10726L9.27595 4.80015L9.06329 5.93347L9.18734 5.93347L9.32911 5.7918L9.90329 5.03036L10.8673 3.82621L11.2927 3.34809L11.7889 2.82039L12.1078 2.56894L12.7104 2.56894L13.1534 3.22768L12.9549 3.90767L12.3347 4.6939L11.8208 5.35973L11.0835 6.35138L10.6228 7.1447L10.6653 7.20845L10.7752 7.19782L12.441 6.84366L13.3413 6.68075L14.4152 6.49659L14.9008 6.72325L14.9539 6.95345L14.7625 7.42449L13.6142 7.70782L12.2673 7.97698L10.2613 8.45156L10.2365 8.46926L10.2648 8.50468L11.1686 8.58968L11.5549 8.61093L12.5013 8.61093L14.2628 8.74197L14.7235 9.04655L15 9.41842L14.9539 9.70175L14.2451 10.063L13.2881 9.83633L11.0552 9.30509L10.2896 9.11384L10.1833 9.11384L10.1833 9.17759L10.8213 9.80091L11.9909 10.8563L13.4547 12.2163L13.5291 12.5527L13.3413 12.8184L13.1428 12.79L11.8562 11.8232L11.36 11.3876L10.2365 10.4419L10.162 10.4419L10.162 10.5411L10.4208 10.9201L11.7889 12.9742L11.8597 13.6046L11.7605 13.81L11.4061 13.934L11.0162 13.8631L10.2152 12.7404L9.38937 11.4761L8.72304 10.3428L8.64152 10.3888L8.2481 14.621L8.0638 14.8371L7.63848 15L7.28405 14.7308L7.0962 14.2952L7.28405 13.4346L7.51089 12.3119L7.69519 11.4194L7.86177 10.3109L7.96101 9.94258L7.95392 9.91778L7.8724 9.92841L7.03595 11.0759L5.76354 12.7936L4.75696 13.8702L4.51595 13.9658L4.09772 13.7498L4.13671 13.3638L4.37063 13.0202L5.76354 11.2494L6.60354 10.1515L7.14582 9.51758L7.14228 9.4255L7.11038 9.4255L3.41013 11.8267L2.75089 11.9117L2.46734 11.6461L2.50278 11.2105L2.63747 11.0688L3.75038 10.3038L3.74684 10.3074Z"
        fill="#D97757"
      />
    </svg>
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
      <span className="relative inline-block size-[5px] rounded-full bg-[#1fc16b] shadow-[0_0_0_2px_rgba(31,193,107,0.18)]" />
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
