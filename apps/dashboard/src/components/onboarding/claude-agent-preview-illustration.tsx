import {
  ChatProviderIdEnum,
  CLAUDE_BUILTIN_TOOLS,
  ClaudeBuiltinTool,
  CONVERSATIONAL_PROVIDERS,
  EmailProviderIdEnum,
  getMcpIconPath,
} from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { AwsIcon } from '@/components/icons/aws';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { ConnectLogomark } from '../icons/connect-logomark';
import { AnthropicAsteriskIcon } from './agent-flow-illustration-shared';

export type ManagedConnectorKind = 'anthropic' | 'aws';

export type ManagedAgentPreviewStatus = 'idle' | 'connecting' | 'connected';

type ClaudeAgentPreviewProps = {
  connector: ManagedConnectorKind;
  isDemoCredential: boolean;
  status: ManagedAgentPreviewStatus;
  /**
   * Whether the agent has been provisioned on the backend. While the connect-phase form is
   * still being filled in (or its submission is in flight), this is `false` and the channels
   * section is rendered with a "placeholder" dimmed look. Flips to `true` once the agent
   * record exists, at which point the channels card lights up and per-channel state takes over.
   */
  agentCreated: boolean;
  name?: string;
  description?: string;
  instructions?: string;
  mcpServers: ReadonlyArray<string>;
  tools: ReadonlyArray<string>;
  /**
   * Provider id (from `ChatProviderIdEnum`/`EmailProviderIdEnum`) the user picked from the
   * provider cards in the details phase. When set, the matching channel card lights up; if
   * the provider isn't part of the base list it gets appended dynamically.
   */
  selectedProviderId?: string;
  /**
   * Provider ids whose integration is actually linked + connected to the agent. Each gets a
   * green CONNECTED pill; any id outside the base list is appended dynamically. Both selected
   * and connected ids are deduplicated against the base list while preserving insertion order.
   */
  connectedProviderIds?: ReadonlyArray<string>;
};

const TRANSITION = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

// Figma frame is 400px wide. We render at the same fidelity so the design lands pixel-for-pixel
// once the OnboardingShell centers it in the 40% right panel.
const FRAME_WIDTH = 400;

function ClaudeAgentPreviewIllustration({
  connector,
  isDemoCredential,
  status,
  agentCreated,
  name,
  description,
  instructions,
  mcpServers,
  tools,
  selectedProviderId,
  connectedProviderIds,
}: ClaudeAgentPreviewProps) {
  const hasContent = Boolean(name) || mcpServers.length > 0 || tools.length > 0 || Boolean(instructions);
  const displayName = name?.trim() || 'Generate agent...';
  const displayDescription =
    description?.trim() ||
    (hasContent
      ? undefined
      : connector === 'aws'
        ? 'Generate an agent via Novu Copilot and provision it on AWS Claude.'
        : 'Generate an agent via Novu Copilot and provision it in Claude via Novu Connect.');
  const isCardDimmed = !agentCreated;

  return (
    <div className="flex flex-col items-stretch" style={{ width: FRAME_WIDTH, fontFamily: 'Inter' }}>
      <AgentCard
        connector={connector}
        isDemoCredential={isDemoCredential}
        status={status}
        agentCreated={agentCreated}
        displayName={displayName}
        isPlaceholderName={!name?.trim()}
        description={displayDescription}
        instructions={instructions}
        mcpServers={mcpServers}
        tools={tools}
      />

      <ConnectorJoin />

      <motion.div
        animate={{ opacity: isCardDimmed ? 0.6 : 1 }}
        transition={TRANSITION}
        className="flex flex-col gap-1 p-1 bg-bg-weak rounded-[8px] border border-stroke-weak"
      >
        <ChannelsCard
          agentCreated={agentCreated}
          selectedProviderId={selectedProviderId}
          connectedProviderIds={connectedProviderIds ?? []}
        />

        <NovuConnectFooter />
      </motion.div>
    </div>
  );
}

export type AgentCardProps = {
  connector: ManagedConnectorKind;
  isDemoCredential: boolean;
  status: ManagedAgentPreviewStatus;
  /**
   * Gates the per-field cross-fade animation. While the user is still authoring the form
   * the values flow into the preview verbatim (no animation noise on every keystroke or
   * dropdown change). Once the agent is created and the API response replaces the local
   * snapshot, the animation enables and any subsequent value swaps cross-fade gracefully.
   */
  agentCreated: boolean;
  displayName: string;
  isPlaceholderName: boolean;
  description?: string;
  instructions?: string;
  mcpServers: ReadonlyArray<string>;
  tools: ReadonlyArray<string>;
};

export function AgentCard({
  connector,
  isDemoCredential,
  status,
  agentCreated,
  displayName,
  isPlaceholderName,
  description,
  instructions,
  mcpServers,
  tools,
}: AgentCardProps) {
  return (
    <div className="flex flex-col gap-1 p-1 bg-bg-weak rounded-[8px] border border-stroke-weak">
      <div className="border-stroke-soft bg-bg-white relative overflow-hidden rounded-lg border shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex h-8 items-center justify-between px-2 bg-bg-weak">
          <div className="flex min-w-0 items-center gap-1.5">
            <ConnectorBrandIcon connector={connector} className="size-4 shrink-0" />
            <AnimatedField as="span" enabled={agentCreated} signature={displayName}>
              <span
                className={`truncate text-label-xs font-normal leading-4 ${
                  isPlaceholderName ? 'text-text-sub' : 'text-text-strong'
                }`}
                title={displayName}
              >
                {displayName}
              </span>
            </AnimatedField>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="flex flex-col gap-5 px-2 pb-3 pt-2">
          {description ? (
            <AnimatedField enabled={agentCreated} signature={description}>
              <p className="text-label-xs font-normal text-text-soft line-clamp-2 leading-4" title={description}>
                {description}
              </p>
            </AnimatedField>
          ) : null}

          <PreviewSection label="MCPs">
            <AnimatedField enabled={agentCreated} signature={mcpServers.join('|')}>
              {mcpServers.length > 0 ? <McpTagRow ids={mcpServers} /> : <NotConfiguredLabel />}
            </AnimatedField>
          </PreviewSection>

          <PreviewSection label="Tools">
            <AnimatedField enabled={agentCreated} signature={tools.join('|')}>
              {tools.length > 0 ? <ToolTagRow tools={tools} /> : <NotConfiguredLabel />}
            </AnimatedField>
          </PreviewSection>

          <PreviewSection label="Instructions">
            <AnimatedField enabled={agentCreated} signature={instructions ?? ''}>
              {instructions?.trim() ? <InstructionsBlock value={instructions} /> : <NotConfiguredLabel />}
            </AnimatedField>
          </PreviewSection>
        </div>
      </div>

      <ConnectorFooter connector={connector} isDemoCredential={isDemoCredential} />
    </div>
  );
}

type AnimatedFieldProps = {
  /**
   * When false, the wrapper is a no-op — children render verbatim and value swaps don't
   * animate (avoids jitter on every keystroke). Flips to true at the moment the agent is
   * created so the form-snapshot → server-authoritative transition cross-fades.
   */
  enabled: boolean;
  /**
   * Stable hash of the rendered value. While `enabled`, used as the AnimatePresence child
   * key so a different signature triggers exit + enter. While disabled, the key is pinned
   * so connect-phase keystrokes don't keep remounting the field.
   */
  signature: string;
  /**
   * Element used by the wrapping motion node. Defaults to `'div'`. Use `'span'` when the
   * field lives inside an inline flow (e.g. the header row alongside the connector icon).
   */
  as?: 'div' | 'span';
  children: React.ReactNode;
};

const FIELD_TRANSITION = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const STATIC_KEY = '__connect_phase__';

/**
 * Always renders an AnimatePresence + motion node so the structure stays stable across the
 * connect → details transition. We gate the animation by toggling the key:
 *   - disabled: pinned key + `initial={false}` on the motion node → mounts at rest, no
 *     entrance animation, no remounts on form keystrokes.
 *   - enabled: signature key → flipping enabled (or any signature change) makes
 *     AnimatePresence run exit on the old child + enter on the new one.
 *
 * `AnimatePresence`'s own `initial` prop is captured on its first mount, so we mirror the
 * `enabled` flag there: that way fields that only appear post-creation still animate in.
 */
function AnimatedField({ enabled, signature, as = 'div', children }: AnimatedFieldProps) {
  const MotionTag = as === 'span' ? motion.span : motion.div;
  const presenceKey = enabled ? `live:${signature}` : STATIC_KEY;

  return (
    <AnimatePresence mode="wait" initial={enabled}>
      <MotionTag
        key={presenceKey}
        initial={enabled ? { opacity: 0, y: -4 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={FIELD_TRANSITION}
        // Span needs `inline-block` so the y-translate animation actually applies.
        className={as === 'span' ? 'inline-block min-w-0' : undefined}
      >
        {children}
      </MotionTag>
    </AnimatePresence>
  );
}

type ConnectorBrandIconProps = {
  connector: ManagedConnectorKind;
  className?: string;
};

function ConnectorBrandIcon({ connector, className }: ConnectorBrandIconProps) {
  if (connector === 'aws') {
    return <AwsIcon className={className} />;
  }

  return <AnthropicAsteriskIcon className={className} />;
}

type StatusBadgeProps = {
  status: ManagedAgentPreviewStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'connected' ? (
        <motion.div
          key="connected"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={TRANSITION}
          className="flex flex-col items-center justify-center"
        >
          <SuccessBadge label="CONNECTED" />
        </motion.div>
      ) : status === 'connecting' ? (
        <motion.div
          key="connecting"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={TRANSITION}
          className="flex flex-col items-center justify-center"
        >
          <ConnectingBadge label="CONNECTING ..." />
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANSITION}
          className="flex flex-col items-center justify-center"
        >
          <PreviewBadge />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type SuccessBadgeProps = {
  label: string;
};

function SuccessBadge({ label }: SuccessBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e0faec] px-1.5 py-[2px]">
      <span className="relative inline-block size-[5px] rounded-full bg-[#1fc16b] shadow-[0_0_0_2px_rgba(31,193,107,0.18)]" />
      <span
        className="text-[9px] font-medium uppercase leading-3 tracking-[0.54px] text-[#1fc16b]"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
      >
        {label}
      </span>
    </span>
  );
}

type ConnectingBadgeProps = {
  label: string;
};

function ConnectingBadge({ label }: ConnectingBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef1e5] px-1.5 py-[2px]">
      <motion.span
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative inline-block size-[5px] rounded-full bg-[#f17b2c] shadow-[0_0_0_2px_rgba(241,123,44,0.18)]"
      />
      <span
        className="text-[9px] font-medium uppercase leading-3 tracking-[0.54px] text-[#f17b2c]"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
      >
        {label}
      </span>
    </span>
  );
}

function PreviewBadge() {
  return (
    <span className="bg-[rgba(118,118,132,0.04)] inline-flex items-center rounded px-1.5 py-[2px]">
      <span
        className="text-text-soft text-[9px] font-medium uppercase leading-3 tracking-[0.54px]"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
      >
        PREVIEW
      </span>
    </span>
  );
}

type PreviewSectionProps = {
  label: string;
  children: React.ReactNode;
};

function PreviewSection({ label, children }: PreviewSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-text-soft text-[11px] font-medium leading-3">{label}</span>
        <span className="bg-[#F2F4F7] h-px flex-1" />
      </div>
      <div>{children}</div>
    </div>
  );
}

function NotConfiguredLabel() {
  return <span className="text-label-xs font-normal text-text-disabled leading-4">Not configured</span>;
}

type McpTagRowProps = {
  ids: ReadonlyArray<string>;
};

const MAX_VISIBLE_MCP_TAGS = 4;

function McpTagRow({ ids }: McpTagRowProps) {
  const visible = ids.slice(0, MAX_VISIBLE_MCP_TAGS);
  const hidden = ids.slice(MAX_VISIBLE_MCP_TAGS);
  const overflow = ids.length - visible.length;
  const hiddenMcp = useMemo(() => hidden.map((id) => formatMcpLabel(id)).join(', '), [hidden]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((id) => (
        <McpTag key={id} id={id} />
      ))}
      {overflow > 0 ? <OverflowTag count={overflow} title={hiddenMcp} /> : null}
    </div>
  );
}

type McpTagProps = {
  id: string;
};

function McpTag({ id }: McpTagProps) {
  const iconPath = getMcpIconPath(id);
  const label = formatMcpLabel(id);

  return (
    <span className="border border-stroke-soft bg-bg-weak inline-flex h-5 items-center gap-1 rounded px-1 py-0.5">
      {iconPath ? <img src={iconPath} alt={label} className="size-3.5" aria-hidden /> : null}
      <span className="text-text-sub text-[12px] font-medium leading-4">{label}</span>
    </span>
  );
}

function formatMcpLabel(id: string): string {
  return id
    .split(/[-_]/)
    .map((part) => (part.length === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
}

type ToolTagRowProps = {
  tools: ReadonlyArray<string>;
};

const MAX_VISIBLE_TOOL_TAGS = 4;

function ToolTagRow({ tools }: ToolTagRowProps) {
  const visible = tools.slice(0, MAX_VISIBLE_TOOL_TAGS);
  const hidden = tools.slice(MAX_VISIBLE_TOOL_TAGS);
  const overflow = tools.length - visible.length;
  const hiddenTools = useMemo(() => hidden.map((tool) => TOOL_LABEL_BY_ID.get(tool)?.name).join(', '), [hidden]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((id) => (
        <ToolTag key={id} id={id} />
      ))}
      {overflow > 0 ? <OverflowTag count={overflow} title={hiddenTools} /> : null}
    </div>
  );
}

type ToolTagProps = {
  id: string;
};

const TOOL_LABEL_BY_ID = new Map<string, ClaudeBuiltinTool>(CLAUDE_BUILTIN_TOOLS.map((tool) => [tool.type, tool]));

function ToolTag({ id }: ToolTagProps) {
  const tool = TOOL_LABEL_BY_ID.get(id);

  return (
    <span
      className="border border-stroke-soft bg-bg-weak text-text-sub inline-flex h-5 items-center rounded px-1 text-[12px] font-medium leading-4"
      title={tool?.description}
    >
      {tool?.name}
    </span>
  );
}

type OverflowTagProps = {
  count: number;
  title: string;
};

function OverflowTag({ count, title }: OverflowTagProps) {
  return (
    <span
      className="border-stroke-soft bg-bg-weak text-text-soft inline-flex h-5 items-center rounded px-1 text-[12px] font-medium leading-4"
      title={title}
    >
      +{count}
    </span>
  );
}

type InstructionsBlockProps = {
  value: string;
};

function InstructionsBlock({ value }: InstructionsBlockProps) {
  return (
    <p className="text-text-sub line-clamp-3 whitespace-pre-wrap text-[12px] leading-4" title={value}>
      {value}
    </p>
  );
}

type ConnectorFooterProps = {
  connector: ManagedConnectorKind;
  isDemoCredential: boolean;
};

function ConnectorFooter({ connector, isDemoCredential }: ConnectorFooterProps) {
  const label = connector === 'aws' ? 'AWS Claude Managed' : 'Claude Managed';

  return (
    <div className="flex h-7 items-center gap-1 px-1">
      <ConnectorBrandIcon connector={connector} className="size-4 shrink-0" />
      <span className="text-text-strong text-label-xs font-normal leading-4">{label}</span>
      <AnimatePresence initial={false}>
        {isDemoCredential ? (
          <motion.span
            key="demo"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={TRANSITION}
            className="text-label-xs font-normal ml-1 inline-flex items-center gap-1.5 text-[12px] leading-4 border bg-bg-white border-stroke-weak rounded-lg px-1.5 py-[2px]"
          >
            <span className="inline-block size-[6px] rounded-full bg-[#1fc16b]" />
            Demo credential
          </motion.span>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ConnectorJoin() {
  return (
    <div className="flex h-16 items-center justify-center">
      <div className="flex items-stretch gap-2">
        <ConnectorLine direction="down" />
        <ConnectorLine direction="up" />
      </div>
    </div>
  );
}

type ConnectorLineProps = {
  direction: 'up' | 'down';
};

function ConnectorLine({ direction }: ConnectorLineProps) {
  return (
    <div className="relative flex h-10 w-px items-center justify-center">
      <div className="bg-stroke-soft h-full w-px" />
      <span
        className={`bg-stroke-soft absolute left-1/2 size-[5px] -translate-x-1/2 rounded-full ${
          direction === 'down' ? 'top-6' : 'top-3'
        }`}
      />
    </div>
  );
}

type ChannelsCardProps = {
  agentCreated: boolean;
  selectedProviderId?: string;
  connectedProviderIds: ReadonlyArray<string>;
};

/**
 * Channels rendered by default in the illustration. Designed to mirror Figma's showcase
 * (Slack / MS Teams / WhatsApp). When the user picks or connects a provider outside this
 * list it gets swapped in from the end so the total stays at exactly 3 cards.
 */
const BASE_CHANNEL_PROVIDER_IDS: ReadonlyArray<string> = [
  ChatProviderIdEnum.Slack,
  ChatProviderIdEnum.MsTeams,
  ChatProviderIdEnum.WhatsAppBusiness,
];

const VISIBLE_CHANNEL_COUNT = 3;

const PROVIDER_DISPLAY_NAME_BY_ID = new Map<string, string>(
  CONVERSATIONAL_PROVIDERS.map((provider) => [provider.providerId, provider.displayName])
);

/**
 * Shorter labels for the illustration. Falls back to the `CONVERSATIONAL_PROVIDERS` display
 * name when no override exists, then to the providerId as a last resort.
 */
const PROVIDER_DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  [ChatProviderIdEnum.WhatsAppBusiness]: 'WhatsApp',
  [EmailProviderIdEnum.NovuAgent]: 'Email',
};

function getChannelDisplayName(providerId: string): string {
  return PROVIDER_DISPLAY_NAME_OVERRIDES[providerId] ?? PROVIDER_DISPLAY_NAME_BY_ID.get(providerId) ?? providerId;
}

function resolveChannelStatus(
  providerId: string,
  agentCreated: boolean,
  selectedProviderId: string | undefined,
  connectedProviderIds: ReadonlyArray<string>
): ChannelCardStatus {
  // Before the agent is created, every channel reads as a faded preview.
  if (!agentCreated) return 'dimmed';
  // A connected provider always shows as connected, even if the user later picks a different
  // one — the integration is still active on the agent.
  if (connectedProviderIds.includes(providerId)) return 'connected';
  // After creation but before picking a provider, every channel still reads as a faded preview.
  if (!selectedProviderId) return 'dimmed';
  // Once a channel is picked, only that one comes forward; the others stay faded.
  if (providerId !== selectedProviderId) return 'dimmed';

  return 'connecting';
}

function ChannelsCard({ agentCreated, selectedProviderId, connectedProviderIds }: ChannelsCardProps) {
  // Always render exactly `VISIBLE_CHANNEL_COUNT` cards. Outside-base providers (selected
  // first, then connected) take precedence and push base channels out from the right, so the
  // showcase remains stable until the user actually picks something off the canonical list.
  const channelIds = useMemo(() => {
    const outsideBase: string[] = [];
    const pushIfOutside = (id: string | undefined) => {
      if (!id) return;
      if (BASE_CHANNEL_PROVIDER_IDS.includes(id)) return;
      if (outsideBase.includes(id)) return;
      outsideBase.push(id);
    };
    pushIfOutside(selectedProviderId);
    for (const id of connectedProviderIds) pushIfOutside(id);

    const outsideSlots = outsideBase.slice(0, VISIBLE_CHANNEL_COUNT);
    const baseSlots = BASE_CHANNEL_PROVIDER_IDS.slice(0, VISIBLE_CHANNEL_COUNT - outsideSlots.length);

    return [...baseSlots, ...outsideSlots];
  }, [selectedProviderId, connectedProviderIds]);

  return (
    <div className="flex flex-col gap-1">
      <div className="border-stroke-soft bg-bg-white flex flex-col gap-3 rounded-lg border p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex h-3 items-center gap-2">
          <span className="text-text-soft text-[11px] font-medium leading-3">Channels</span>
          <span className="bg-[#F2F4F7] h-px flex-1" />
        </div>
        <div className="flex items-stretch gap-[11px]">
          {channelIds.map((providerId, index) => (
            <ChannelCard
              // Keying by slot index — not providerId — keeps the 3 card frames permanently
              // mounted so flex never sees a transient 2-child layout when a provider swaps.
              // Content swaps inside via crossfade.
              key={`slot-${index}`}
              providerId={providerId}
              status={resolveChannelStatus(providerId, agentCreated, selectedProviderId, connectedProviderIds)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type ChannelCardStatus = 'dimmed' | 'connecting' | 'connected';

type ChannelCardProps = {
  providerId: string;
  status: ChannelCardStatus;
};

function ChannelCard({ providerId, status }: ChannelCardProps) {
  const isDimmed = status === 'dimmed';
  const name = getChannelDisplayName(providerId);

  return (
    <div className="border-stroke-soft bg-bg-white flex min-w-0 flex-1 flex-col gap-2 rounded-md border p-2">
      <motion.div animate={{ opacity: isDimmed ? 0.5 : 1 }} transition={TRANSITION} className="relative h-5 min-w-0">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={providerId}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] as const }}
            className="absolute inset-0 flex min-w-0 items-center gap-1"
          >
            <ProviderIcon providerId={providerId} providerDisplayName={name} className="size-4 shrink-0" />
            <span className="text-text-sub truncate text-[12px] font-medium leading-4">{name}</span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <ChannelStatusPill status={status} />
    </div>
  );
}

type ChannelStatusPillProps = {
  status: ChannelCardStatus;
};

const PILL_LABEL_STYLE = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

const PILL_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

/**
 * Wraps the per-status pill in an AnimatePresence keyed by status so that picking an
 * in-list provider (where the slot's providerId doesn't change) still produces a visible
 * cross-fade as `dimmed` → `connecting` → `connected`. Without this, the only animated
 * delta on an in-list pick is the icon row's opacity tween, which is too subtle to notice.
 */
function ChannelStatusPill({ status }: ChannelStatusPillProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'connected' ? (
        <motion.span
          key="connected"
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          transition={PILL_TRANSITION}
          className="inline-flex h-5 min-w-0 items-center justify-center gap-1 self-stretch rounded bg-[#e0faec] px-1.5"
        >
          <span className="size-[5px] shrink-0 rounded-full bg-[#1fc16b]" />
          <span
            className="truncate text-[9px] font-medium uppercase leading-3 tracking-[0.54px] text-[#1fc16b]"
            style={PILL_LABEL_STYLE}
          >
            CONNECTED
          </span>
        </motion.span>
      ) : status === 'connecting' ? (
        <motion.span
          key="connecting"
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          transition={PILL_TRANSITION}
          className="inline-flex h-5 min-w-0 items-center justify-center gap-1 self-stretch rounded bg-[#fef1e5] px-1.5"
        >
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="size-[5px] shrink-0 rounded-full bg-[#f17b2c]"
          />
          <span
            className="truncate text-[9px] font-medium uppercase leading-3 tracking-[0.54px] text-[#f17b2c]"
            style={PILL_LABEL_STYLE}
          >
            CONNECTING ...
          </span>
        </motion.span>
      ) : (
        <motion.span
          key="dimmed"
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 0.6, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          transition={PILL_TRANSITION}
          className="bg-bg-weak inline-flex h-5 min-w-0 items-center justify-center gap-1 self-stretch rounded px-1.5"
        >
          <span className="bg-text-soft size-[5px] shrink-0 rounded-full" />
          <span
            className="text-text-soft truncate text-[9px] font-medium uppercase leading-3 tracking-[0.54px]"
            style={PILL_LABEL_STYLE}
          >
            NOT CONNECTED
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function NovuConnectFooter() {
  return (
    <div className="mt-1 flex h-7 items-center gap-1 px-1">
      <ConnectLogomark surface="light" treatment="color" className="size-4" />
      <span className="text-text-strong text-label-xs font-normal leading-4">Connect</span>
    </div>
  );
}
