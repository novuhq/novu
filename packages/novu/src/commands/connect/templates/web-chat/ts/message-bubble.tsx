'use client';

import type { AgentMessage, UseWebChatResult } from '@novu/react';
import type { ReactNode } from 'react';
import { ArrowUpRightIcon, ChevronIcon, WarningIcon } from './icons';
import { Markdown } from './markdown';
import { formatTime, safeExternalUrl } from './message-utils';
import { McpConnectionCard, ToolApprovalCard } from './pending-action-card';

type AgentMessagePart = AgentMessage['parts'][number];
type TextPart = Extract<AgentMessagePart, { type: 'text' }>;
type ToolPart = Extract<AgentMessagePart, { type: 'tool' }>;
type CardPart = Extract<AgentMessagePart, { type: 'card' }>;
type ApprovalPart = Extract<AgentMessagePart, { type: 'approval' }>;
type McpConnectionPart = Extract<AgentMessagePart, { type: 'mcp-connection' }>;
type CardAction = Parameters<UseWebChatResult['sendAction']>[0];

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatToolOutput(output: ToolPart['output']): string | undefined {
  if (!output?.length) {
    return undefined;
  }

  const chunks = output.map((part) => {
    switch (part.type) {
      case 'text':
        return part.text;
      case 'json':
        return prettyJson(part.value);
      case 'citation':
        return part.title ? `${part.title}\n${part.url}` : part.url;
      case 'media':
        return part.name ?? part.mediaType;
      default:
        return prettyJson(part.data);
    }
  });

  return chunks.filter(Boolean).join('\n\n') || undefined;
}

function PayloadPeek({ label, value }: { label: string; value: string }) {
  return (
    <div className="payload-peek">
      <span className="payload-peek-label">{label}</span>
      <pre className="payload-peek-value">{value}</pre>
    </div>
  );
}

function ExpandableRow({
  id,
  className,
  summary,
  children,
}: {
  id?: string;
  className?: string;
  summary: ReactNode;
  children?: ReactNode;
}) {
  if (!children) {
    return (
      <span id={id} className={className}>
        {summary}
      </span>
    );
  }

  return (
    <details id={id} className={`expandable-row${className ? ` ${className}` : ''}`}>
      <summary>{summary}</summary>
      <div className="expandable-body">{children}</div>
    </details>
  );
}

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

type MessageRowProps = {
  message: AgentMessage;
  onCardAction: UseWebChatResult['sendAction'];
  onRespond: UseWebChatResult['respondToAction'];
  cardActionsDisabled: boolean;
};

export function MessageRow({ message, onCardAction, onRespond, cardActionsDisabled }: MessageRowProps) {
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
  const time = formatTime(message.createdAt);
  const failed = message.status === 'failed';

  if (isUser) {
    return (
      <article className="message-row message-row-user" data-status={message.status}>
        <div className="message-user-line">
          {time ? <time>{time}</time> : null}
          <div className="message-bubble message-bubble-user">{text}</div>
        </div>
        {failed ? (
          <span className="message-failed">
            <WarningIcon size={12} />
            Not sent
          </span>
        ) : null}
      </article>
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
    <article className="message-row message-row-agent">
      <div className="message-agent-content">
        {text ? (
          <div className="message-text">
            <Markdown text={text} />
            {isStreaming ? <span className="stream-cursor" aria-hidden /> : null}
          </div>
        ) : null}

        {visibleCards.map((part, index) => (
          <MessageCard
            key={`${message.id}-card-${index}`}
            card={part.card}
            disabled={cardActionsDisabled}
            onAction={(action) => void onCardAction({ ...action, sourceMessageId: message.id })}
          />
        ))}

        {visibleTools.length > 0 ? (
          <div className="tool-list tool-list-stack">
            {visibleTools.map((tool) => (
              <ToolChip key={tool.toolUseId} tool={tool} />
            ))}
          </div>
        ) : null}

        {approvals.map((part) => (
          <ToolApprovalCard key={part.approvalId} part={part} disabled={cardActionsDisabled} onRespond={onRespond} />
        ))}

        {mcpConnections.map((part) => (
          <McpConnectionCard key={part.actionId} part={part} />
        ))}
      </div>

      {time ? <time>{time}</time> : null}
    </article>
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

function brandedReplyMarkdown(card: Record<string, unknown>): string | null {
  if (readString(card.title) || readString(card.subtitle) || safeExternalUrl(readString(card.imageUrl))) {
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

function cardButtonsFromNode(node: unknown): CardButtonView[] {
  if (!isRecord(node)) return [];

  if (node.type === 'button') {
    const id = readString(node.id);
    const label = readString(node.label);
    return id && label ? [{ id, label, value: readString(node.value), style: readString(node.style) }] : [];
  }

  if (node.type === 'actions' && Array.isArray(node.children)) {
    return node.children.flatMap(cardButtonsFromNode);
  }

  return [];
}

function cardChildFromNode(node: unknown): CardChildView | null {
  if (!isRecord(node)) return null;

  if (node.type === 'text') {
    const content = readString(node.content);
    return content ? { type: 'text', content } : null;
  }

  if (node.type === 'divider') return { type: 'divider' };

  if (node.type === 'image') {
    const url = safeExternalUrl(readString(node.url));
    return url ? { type: 'image', url, alt: readString(node.alt) ?? '' } : null;
  }

  if (node.type === 'link') {
    const url = safeExternalUrl(readString(node.url));
    const label = readString(node.label);
    return url && label ? { type: 'link', url, label } : null;
  }

  const buttons = cardButtonsFromNode(node);
  return buttons.length ? { type: 'actions', buttons } : null;
}

function cardViewFromRecord(card: Record<string, unknown>): CardView {
  const children = Array.isArray(card.children) ? card.children : [];

  return {
    title: readString(card.title),
    subtitle: readString(card.subtitle),
    imageUrl: safeExternalUrl(readString(card.imageUrl)),
    children: children.flatMap((child) => {
      const view = cardChildFromNode(child);
      return view ? [view] : [];
    }),
  };
}

function MessageCard({
  card,
  disabled,
  onAction,
}: {
  card: Record<string, unknown>;
  disabled: boolean;
  onAction: (action: Omit<CardAction, 'sourceMessageId'>) => void;
}) {
  const view = cardViewFromRecord(card);

  return (
    <section className="message-card">
      {view.imageUrl ? <img src={view.imageUrl} alt={view.title ?? ''} /> : null}
      {view.title ? <h2>{view.title}</h2> : null}
      {view.subtitle ? <p className="message-card-subtitle">{view.subtitle}</p> : null}

      {view.children.map((child, index) => {
        switch (child.type) {
          case 'text':
            return <Markdown key={index} text={child.content} />;
          case 'divider':
            return <hr key={index} />;
          case 'image':
            return <img key={index} src={child.url} alt={child.alt} />;
          case 'link':
            return (
              <a key={index} href={child.url} target="_blank" rel="noreferrer">
                {child.label}
                <ArrowUpRightIcon />
              </a>
            );
          case 'actions':
            return (
              <div className="message-card-actions" key={index}>
                {child.buttons.map((button) => (
                  <button
                    type="button"
                    key={button.id}
                    data-style={button.style}
                    disabled={disabled}
                    onClick={() => onAction({ actionId: button.id, value: button.value })}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </section>
  );
}

function ToolChip({ tool }: { tool: ToolPart }) {
  const running = tool.state === 'input-streaming' || tool.state === 'input-available';
  const failed = tool.state === 'output-error';
  let statusLabel = 'Used';

  if (running) {
    statusLabel = 'Running';
  } else if (failed) {
    statusLabel = 'Failed';
  }

  const inputPreview = tool.input && Object.keys(tool.input).length > 0 ? prettyJson(tool.input) : undefined;
  const outputPreview = formatToolOutput(tool.output);

  return (
    <ExpandableRow
      summary={
        <span
          className={`tool-chip${failed ? ' tool-chip-failed' : ''}`}
          data-state={failed ? 'failed' : running ? 'running' : 'complete'}
        >
          {running ? (
            <span className="spinner" aria-hidden />
          ) : (
            <ChevronIcon size={14} className="expandable-chevron" />
          )}
          <span>{statusLabel}</span>
          <code>{tool.toolName}</code>
        </span>
      }
    >
      {inputPreview || outputPreview ? (
        <>
          {inputPreview ? <PayloadPeek label="Input" value={inputPreview} /> : null}
          {outputPreview ? <PayloadPeek label="Result" value={outputPreview} /> : null}
        </>
      ) : null}
    </ExpandableRow>
  );
}
