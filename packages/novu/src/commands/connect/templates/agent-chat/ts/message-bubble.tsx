'use client';

import type { AgentMessage, UseAgentChatResult } from '@novu/react';
import { ArrowUpRightIcon, ChatIcon, ToolIcon, WarningIcon } from './icons';
import { Markdown } from './markdown';
import { formatTime, safeExternalUrl } from './message-utils';

type AgentMessagePart = AgentMessage['parts'][number];
type TextPart = Extract<AgentMessagePart, { type: 'text' }>;
type ToolPart = Extract<AgentMessagePart, { type: 'tool' }>;
type CardPart = Extract<AgentMessagePart, { type: 'card' }>;
type CardAction = Parameters<UseAgentChatResult['sendAction']>[0];

type MessageRowProps = {
  message: AgentMessage;
  showAvatar: boolean;
  onCardAction: UseAgentChatResult['sendAction'];
  cardActionsDisabled: boolean;
};

export function MessageRow({ message, showAvatar, onCardAction, cardActionsDisabled }: MessageRowProps) {
  const isUser = message.role === 'user';
  const textParts = message.parts.filter((part): part is TextPart => part.type === 'text');
  const text = textParts.map((part) => part.text).join('');
  const isStreaming = textParts.some((part) => part.state === 'streaming');
  const tools = message.parts.filter((part): part is ToolPart => part.type === 'tool');
  const cards = message.parts.filter((part): part is CardPart => part.type === 'card');
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

  if (!text && tools.length === 0 && cards.length === 0) {
    return null;
  }

  return (
    <article className="message-row message-row-agent">
      {showAvatar ? (
        <span className="agent-avatar" aria-hidden>
          <ChatIcon size={14} />
        </span>
      ) : (
        <span className="agent-avatar-spacer" aria-hidden />
      )}

      <div className="message-agent-content">
        {text ? (
          <div className="message-bubble message-bubble-agent">
            <Markdown text={text} />
            {isStreaming ? <span className="stream-cursor" aria-hidden /> : null}
          </div>
        ) : null}

        {cards.map((part, index) => (
          <MessageCard
            key={`${message.id}-card-${index}`}
            card={part.card}
            disabled={cardActionsDisabled}
            onAction={(action) => void onCardAction({ ...action, sourceMessageId: message.id })}
          />
        ))}

        {tools.length > 0 ? (
          <div className="tool-list">
            {tools.map((tool) => (
              <ToolChip key={tool.toolUseId} tool={tool} />
            ))}
          </div>
        ) : null}
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
        }
      })}
    </section>
  );
}

function ToolChip({ tool }: { tool: ToolPart }) {
  const running = tool.state === 'input-streaming' || tool.state === 'input-available';
  const failed = tool.state === 'output-error';

  return (
    <span className="tool-chip" data-state={failed ? 'failed' : running ? 'running' : 'complete'}>
      {running ? <span className="spinner" aria-hidden /> : failed ? <WarningIcon size={12} /> : <ToolIcon size={12} />}
      <span>{running ? 'Running' : failed ? 'Failed' : 'Used'}:</span>
      <code>{tool.toolName}</code>
    </span>
  );
}
