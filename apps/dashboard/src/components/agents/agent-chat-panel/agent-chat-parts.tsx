import type { AgentMessage } from '@novu/react';
import {
  RiArrowRightSLine,
  RiChat3Fill,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiLoader4Line,
  RiTerminalBoxLine,
} from 'react-icons/ri';
import { McpIcon } from '@/components/agents/mcp-icon';
import { Button } from '@/components/primitives/button';
import { MarkdownText } from '@/components/primitives/markdown-text';
import { cn } from '@/utils/ui';
import { toSafeExternalUrl } from '@/utils/url';

const STARTER_PROMPTS = ['Hello', 'What can you do?', 'What tools do you have available?'] as const;

function isPoweredByWatermark(content: string): boolean {
  const trimmed = content.trim();

  return /^powered by/i.test(trimmed) && /novu/i.test(trimmed);
}

function stripPoweredByWatermark(text: string): string {
  return text
    .replace(
      /(?:\n+)?(?:Powered by\s*\[[^\]]+\]\([^)]+\)|Powered by\s*<https?:\/\/[^|>]+\|[^>]+>|\[Powered by Novu\]\([^)]+\)|Powered by\s*<a\b[^>]*>[\s\S]*?<\/a>|Powered by Novu\u200B?)\s*$/i,
      ''
    )
    .trimEnd();
}

function brandedReplyMarkdown(card: Record<string, unknown>): string | null {
  if (readString(card.title) || readString(card.subtitle) || toSafeExternalUrl(readString(card.imageUrl))) {
    return null;
  }

  const children = Array.isArray(card.children) ? card.children : [];
  const texts: string[] = [];
  let sawWatermark = false;

  for (const child of children) {
    if (!isRecord(child) || child.type !== 'text') {
      return null;
    }

    const content = readString(child.content);
    if (!content) continue;

    if (isPoweredByWatermark(content)) {
      sawWatermark = true;
      continue;
    }

    texts.push(content);
  }

  if (!sawWatermark || texts.length === 0) {
    return null;
  }

  return texts.join('\n\n');
}

type AgentMessagePart = AgentMessage['parts'][number];
type ToolPart = Extract<AgentMessagePart, { type: 'tool' }>;
type TextPart = Extract<AgentMessagePart, { type: 'text' }>;
type CardPart = Extract<AgentMessagePart, { type: 'card' }>;
type ApprovalPart = Extract<AgentMessagePart, { type: 'approval' }>;
type McpConnectionPart = Extract<AgentMessagePart, { type: 'mcp-connection' }>;

export type ToolApprovalDecision = 'approved' | 'denied' | 'trust-tool' | 'trust-server';
export type ToolApprovalRespondHandler = (decision: ToolApprovalDecision) => void;

export type CardActionHandler = (args: { actionId: string; sourceMessageId: string; value?: string }) => void;

function formatMessageTime(createdAt: string): string | null {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function AgentAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'from-primary-base to-error-base flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br',
        className
      )}
      aria-hidden
    >
      <RiChat3Fill className="text-static-white size-3.5" />
    </span>
  );
}

export function ChatEmptyState({ onPickStarter }: { onPickStarter: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
      <p className="text-paragraph-sm text-text-strong max-w-[280px] leading-5">
        Hello, I&apos;m your agent. How can I help you today?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="secondary"
            mode="outline"
            size="2xs"
            className="rounded-full px-3"
            onClick={() => onPickStarter(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ChatMessageRow({
  message,
  showAvatar,
  onCardAction,
  cardActionsDisabled,
  onRespondToAction,
}: {
  message: AgentMessage;
  showAvatar: boolean;
  onCardAction?: CardActionHandler;
  cardActionsDisabled?: boolean;
  onRespondToAction?: (args: { actionId: string; decision: ToolApprovalDecision }) => void;
}) {
  const isUser = message.role === 'user';
  const textParts = message.parts.filter((part): part is TextPart => part.type === 'text');
  const cards = message.parts.filter((part): part is CardPart => part.type === 'card');
  const unwrappedCardText = cards
    .map((part) => brandedReplyMarkdown(part.card))
    .filter((value): value is string => Boolean(value))
    .join('\n\n');
  const visibleCards = cards.filter((part) => brandedReplyMarkdown(part.card) === null);
  const text = stripPoweredByWatermark(
    [textParts.map((part) => part.text).join(''), unwrappedCardText].filter(Boolean).join('\n\n')
  );
  const isStreaming = textParts.some((part) => part.state === 'streaming');
  const tools = message.parts.filter((part): part is ToolPart => part.type === 'tool');
  const approvals = message.parts.filter((part): part is ApprovalPart => part.type === 'approval');
  const mcpConnections = message.parts.filter((part): part is McpConnectionPart => part.type === 'mcp-connection');
  const gatedToolUseIds = new Set(approvals.map((part) => part.toolUseId));
  const visibleTools = tools.filter((tool) => !gatedToolUseIds.has(tool.toolUseId));
  const time = formatMessageTime(message.createdAt);
  const failed = message.status === 'failed';

  if (isUser) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-1 group flex flex-col items-end gap-1 duration-200">
        <div className="flex max-w-full items-end justify-end gap-2">
          {time ? (
            <span className="text-text-soft shrink-0 text-[11px] tabular-nums opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {time}
            </span>
          ) : null}
          <div
            className={cn(
              'bg-bg-weak text-text-strong text-paragraph-sm max-w-[min(30rem,85%)] whitespace-pre-wrap break-words rounded-xl px-3 py-2 leading-5',
              failed && 'ring-error-light ring-1'
            )}
          >
            {text}
          </div>
        </div>
        {failed ? (
          <span className="text-error-base text-label-xs inline-flex items-center gap-1">
            <RiErrorWarningLine className="size-3" aria-hidden />
            Not sent
          </span>
        ) : null}
      </div>
    );
  }

  const hasContent =
    Boolean(text) ||
    visibleTools.length > 0 ||
    visibleCards.length > 0 ||
    approvals.length > 0 ||
    mcpConnections.length > 0;
  if (!hasContent) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 group flex items-start gap-2.5 duration-200">
      {showAvatar ? <AgentAvatar className="mt-0.5" /> : null}
      <div className="flex min-w-0 max-w-full flex-1 flex-col items-start gap-1.5">
        {text ? (
          <div className="text-paragraph-sm text-text-strong w-full leading-5">
            <MarkdownText className="text-paragraph-sm leading-5">{text}</MarkdownText>
            {isStreaming ? (
              <span className="bg-text-strong ml-0.5 inline-block h-3.5 w-0.5 animate-pulse align-middle" aria-hidden />
            ) : null}
          </div>
        ) : null}
        {visibleCards.map((part, index) => (
          <ChatCardPart
            key={`${message.id}-card-${index}`}
            card={part.card}
            disabled={cardActionsDisabled}
            onAction={onCardAction ? (action) => onCardAction({ ...action, sourceMessageId: message.id }) : undefined}
          />
        ))}
        {visibleTools.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleTools.map((tool) => (
              <ToolChip key={tool.toolUseId} tool={tool} />
            ))}
          </div>
        ) : null}
        {approvals.map((part) => (
          <ChatToolApprovalCard
            key={part.approvalId}
            id={part.approvalId}
            toolName={part.toolName}
            source={part.source}
            state={part.state}
            trustToolActionId={part.trustToolActionId}
            trustServerActionId={part.trustServerActionId}
            disabled={cardActionsDisabled}
            onRespond={
              onRespondToAction ? (decision) => onRespondToAction({ actionId: part.approvalId, decision }) : undefined
            }
          />
        ))}
        {mcpConnections.map((part) => (
          <ChatMcpConnectionCard
            key={part.actionId}
            id={part.actionId}
            mcpId={part.mcpId}
            displayName={part.displayName}
            authorizeUrl={part.authorizeUrl}
            authorizeUrlWithAutoApprove={part.authorizeUrlWithAutoApprove}
            state={part.state}
            message={part.message}
          />
        ))}
      </div>
      {time ? (
        <span className="text-text-soft mt-2 shrink-0 self-start text-[11px] tabular-nums opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {time}
        </span>
      ) : null}
    </div>
  );
}

type CardButtonView = { id: string; label: string; value?: string; style?: string };

type CardChildView =
  | { type: 'text'; content: string }
  | { type: 'divider' }
  | { type: 'image'; url: string; alt: string }
  | { type: 'link'; url: string; label: string }
  | { type: 'actions'; buttons: CardButtonView[] };

type CardView = {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: CardChildView[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function cardButtonsFromNode(node: unknown): CardButtonView[] {
  if (!isRecord(node)) {
    return [];
  }

  if (node.type === 'button') {
    const id = readString(node.id);
    const label = readString(node.label);
    if (!id || !label) {
      return [];
    }

    return [{ id, label, value: readString(node.value), style: readString(node.style) }];
  }

  if (node.type === 'actions' && Array.isArray(node.children)) {
    return node.children.flatMap((child) => cardButtonsFromNode(child));
  }

  return [];
}

function cardChildFromNode(node: unknown): CardChildView | null {
  if (!isRecord(node)) {
    return null;
  }

  if (node.type === 'text') {
    const content = readString(node.content);

    return content ? { type: 'text', content } : null;
  }

  if (node.type === 'divider') {
    return { type: 'divider' };
  }

  if (node.type === 'image') {
    const url = toSafeExternalUrl(readString(node.url));

    return url ? { type: 'image', url, alt: readString(node.alt) ?? '' } : null;
  }

  if (node.type === 'link') {
    const url = toSafeExternalUrl(readString(node.url));
    const label = readString(node.label);

    return url && label ? { type: 'link', url, label } : null;
  }

  const buttons = cardButtonsFromNode(node);

  return buttons.length > 0 ? { type: 'actions', buttons } : null;
}

function cardViewFromRecord(card: Record<string, unknown>): CardView {
  const children = Array.isArray(card.children) ? card.children : [];

  return {
    title: readString(card.title),
    subtitle: readString(card.subtitle),
    imageUrl: toSafeExternalUrl(readString(card.imageUrl)),
    children: children.flatMap((child) => {
      const view = cardChildFromNode(child);

      return view ? [view] : [];
    }),
  };
}

function cardButtonAppearance(style?: string): {
  variant: 'error' | 'primary' | 'secondary';
  mode: 'filled' | 'outline';
} {
  if (style === 'danger') {
    return { variant: 'error', mode: 'outline' };
  }

  if (style === 'primary') {
    return { variant: 'primary', mode: 'filled' };
  }

  return { variant: 'secondary', mode: 'outline' };
}

function ChatCardPart({
  card,
  disabled,
  onAction,
}: {
  card: Record<string, unknown>;
  disabled?: boolean;
  onAction?: (args: { actionId: string; value?: string }) => void;
}) {
  const view = cardViewFromRecord(card);

  return (
    <div className="border-stroke-soft bg-bg-white shadow-regular-xs flex w-full flex-col gap-2.5 rounded-2xl rounded-tl-md border px-3.5 py-2.5">
      {view.imageUrl ? (
        <img src={view.imageUrl} alt={view.title ?? ''} className="max-h-40 w-full rounded-lg object-cover" />
      ) : null}
      {view.title ? <p className="text-label-sm text-text-strong font-medium">{view.title}</p> : null}
      {view.subtitle ? <p className="text-label-xs text-text-soft">{view.subtitle}</p> : null}
      {view.children.map((child, index) => {
        switch (child.type) {
          case 'text':
            if (isPoweredByWatermark(child.content)) {
              return null;
            }

            return (
              <MarkdownText key={index} className="text-paragraph-sm leading-5">
                {child.content}
              </MarkdownText>
            );
          case 'divider':
            return <hr key={index} className="border-stroke-soft" />;
          case 'image':
            return (
              <img key={index} src={child.url} alt={child.alt} className="max-h-40 w-full rounded-lg object-cover" />
            );
          case 'link':
            return (
              <a
                key={index}
                href={child.url}
                target="_blank"
                rel="noreferrer"
                className="text-label-xs text-primary-base inline-flex items-center gap-1 font-medium"
              >
                {child.label}
                <RiExternalLinkLine className="size-3" aria-hidden />
              </a>
            );
          case 'actions':
            return (
              <div key={index} className="flex flex-wrap gap-1.5">
                {child.buttons.map((button) => {
                  const appearance = cardButtonAppearance(button.style);

                  return (
                    <Button
                      key={button.id}
                      type="button"
                      size="2xs"
                      variant={appearance.variant}
                      mode={appearance.mode}
                      disabled={disabled || !onAction}
                      onClick={() => onAction?.({ actionId: button.id, value: button.value })}
                    >
                      {button.label}
                    </Button>
                  );
                })}
              </div>
            );
        }
      })}
    </div>
  );
}

function ToolChip({ tool }: { tool: ToolPart }) {
  const isRunning = tool.state === 'input-streaming' || tool.state === 'input-available';
  const isFailed = tool.state === 'output-error';

  return (
    <span
      className={cn('text-label-xs inline-flex items-center gap-1', isFailed ? 'text-error-base' : 'text-text-soft')}
    >
      {isRunning ? (
        <RiLoader4Line className="size-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <RiArrowRightSLine className="size-3.5 shrink-0" aria-hidden />
      )}
      {isRunning ? 'Running' : isFailed ? 'Failed' : 'Used'} <span className="font-mono">{tool.toolName}</span>
    </span>
  );
}

const CHAT_DECISION_CARD_CLASS =
  'animate-in fade-in slide-in-from-bottom-2 bg-bg-weak border-stroke-weak flex w-full flex-col gap-4 overflow-hidden rounded-lg border p-[11px] duration-200';

const FEATURE_PRIMARY_BUTTON_CLASS =
  'text-label-sm text-static-white rounded-md border border-white/12 bg-feature-base hover:brightness-95';

const FEATURE_PRIMARY_BUTTON_STYLE = {
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.16) 20%, rgba(255,255,255,0) 100%), linear-gradient(90deg, hsl(var(--feature-base)), hsl(var(--feature-base)))',
  boxShadow: '0 0 0 0.5px hsl(var(--feature-base))',
} as const;

type ToolApprovalCardProps = {
  id?: string;
  toolName: string;
  source?: ApprovalPart['source'];
  state: ApprovalPart['state'];
  trustToolActionId?: string;
  trustServerActionId?: string;
  disabled?: boolean;
  onRespond?: ToolApprovalRespondHandler;
  className?: string;
};

function ToolApprovalActions({
  disabled,
  onRespond,
  trustToolActionId,
  trustServerActionId,
  source,
}: {
  disabled?: boolean;
  onRespond?: ToolApprovalRespondHandler;
  trustToolActionId?: string;
  trustServerActionId?: string;
  source?: ApprovalPart['source'];
}) {
  const trustServerLabel = trustServerActionId && source?.type === 'mcp' ? source.serverName : undefined;
  const hasTrustActions = Boolean(trustToolActionId) || Boolean(trustServerLabel);

  return (
    <div
      className={cn('flex w-full flex-wrap items-center gap-2', hasTrustActions ? 'justify-between' : 'justify-end')}
    >
      {hasTrustActions ? (
        <div className="flex flex-wrap items-center gap-2">
          {trustToolActionId ? (
            <Button
              type="button"
              size="2xs"
              variant="secondary"
              mode="outline"
              className="text-label-sm text-text-strong rounded-md"
              disabled={disabled || !onRespond}
              onClick={() => onRespond?.('trust-tool')}
            >
              Always allow for this tool
            </Button>
          ) : null}
          {trustServerLabel ? (
            <Button
              type="button"
              size="2xs"
              variant="secondary"
              mode="outline"
              className="text-label-sm text-text-strong rounded-md"
              disabled={disabled || !onRespond}
              onClick={() => onRespond?.('trust-server')}
            >
              Always allow {trustServerLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="2xs"
          variant="secondary"
          mode="outline"
          className="text-label-sm text-text-strong rounded-md"
          disabled={disabled || !onRespond}
          onClick={() => onRespond?.('denied')}
        >
          Deny
        </Button>
        <Button
          type="button"
          size="2xs"
          variant="primary"
          className={FEATURE_PRIMARY_BUTTON_CLASS}
          style={FEATURE_PRIMARY_BUTTON_STYLE}
          disabled={disabled || !onRespond}
          onClick={() => onRespond?.('approved')}
        >
          Approve once
        </Button>
      </div>
    </div>
  );
}

export function ChatToolApprovalCard({
  id,
  toolName,
  source,
  state,
  trustToolActionId,
  trustServerActionId,
  disabled,
  onRespond,
  className,
}: ToolApprovalCardProps) {
  if (state !== 'pending') {
    const isApproved = state === 'approved';

    return (
      <span id={id} className={cn('text-label-xs inline-flex items-center gap-1', className)}>
        <RiArrowRightSLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
        <span className="text-text-soft font-mono">{toolName}</span>
        <span className="text-text-soft" aria-hidden>
          ·
        </span>
        <span className={isApproved ? 'text-text-sub' : 'text-error-base'}>{isApproved ? 'Approved' : 'Denied'}</span>
      </span>
    );
  }

  return (
    <div id={id} className={cn(CHAT_DECISION_CARD_CLASS, className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <RiTerminalBoxLine className="text-text-strong size-5 shrink-0" aria-hidden />
          <p className="text-label-sm text-text-strong min-w-0 flex-1 break-words font-medium tracking-[-0.084px]">
            Run {toolName}?
          </p>
        </div>
        <p className="text-paragraph-xs text-text-strong overflow-hidden leading-[1.7] text-ellipsis">
          The agent is waiting for your approval.
        </p>
      </div>
      <ToolApprovalActions
        disabled={disabled}
        onRespond={onRespond}
        trustToolActionId={trustToolActionId}
        trustServerActionId={trustServerActionId}
        source={source}
      />
    </div>
  );
}

function ChatMcpConnectionCard({
  id,
  mcpId,
  displayName,
  authorizeUrl,
  authorizeUrlWithAutoApprove,
  state,
  message,
}: {
  id?: string;
  mcpId: string;
  displayName: string;
  authorizeUrl: string;
  authorizeUrlWithAutoApprove?: string;
  state: McpConnectionPart['state'];
  message?: string;
}) {
  const safeAuthorizeUrl = toSafeExternalUrl(authorizeUrlWithAutoApprove || authorizeUrl);

  if (state !== 'pending') {
    const isConnected = state === 'connected';

    return (
      <span id={id} className="text-label-xs inline-flex items-center gap-1">
        <RiArrowRightSLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
        <span className="text-text-soft">{displayName}</span>
        <span className="text-text-soft" aria-hidden>
          ·
        </span>
        <span className={isConnected ? 'text-text-sub' : 'text-error-base'}>
          {isConnected ? 'Connected' : message || 'Failed'}
        </span>
      </span>
    );
  }

  return (
    <div
      id={id}
      className="animate-in fade-in slide-in-from-bottom-2 bg-bg-weak border-stroke-weak flex w-full items-center gap-3 overflow-hidden rounded-lg border p-3 duration-200"
    >
      <div className="bg-bg-white ring-stroke-soft flex size-10 shrink-0 items-center justify-center rounded-full ring-1">
        <McpIcon mcpId={mcpId} className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-label-sm text-text-strong truncate font-medium tracking-[-0.084px]">
          Connect {displayName}?
        </p>
        <p className="text-paragraph-xs text-text-sub leading-4">The agent needs authorization to continue.</p>
      </div>
      <Button
        type="button"
        size="2xs"
        variant="primary"
        className={cn(FEATURE_PRIMARY_BUTTON_CLASS, 'shrink-0')}
        style={FEATURE_PRIMARY_BUTTON_STYLE}
        trailingIcon={RiExternalLinkLine}
        disabled={!safeAuthorizeUrl}
        onClick={() => {
          if (!safeAuthorizeUrl) return;
          window.open(safeAuthorizeUrl, '_blank', 'noopener,noreferrer');
        }}
      >
        Authorize
      </Button>
    </div>
  );
}

export function ChatTypingRow({ status }: { status?: string }) {
  // Server statuses often arrive with their own trailing ellipsis or dots.
  const label = status?.trim().replace(/[.\u2026]+$/, '');

  if (label) {
    return (
      <output className="animate-in fade-in flex items-center gap-1 duration-200" aria-label={label}>
        <RiArrowRightSLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
        <span className="text-label-xs text-text-soft">{label}…</span>
      </output>
    );
  }

  return (
    <output className="animate-in fade-in flex items-center gap-1 duration-200" aria-label="Thinking">
      <RiArrowRightSLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
      <span className="text-label-xs text-text-soft">Thinking…</span>
    </output>
  );
}
