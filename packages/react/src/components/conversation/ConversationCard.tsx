import type { CardElement, ConversationMessage } from '@novu/js';
import { getCardNodeId, getCardNodeValue } from '@novu/js';
import React, { type ComponentType, type ReactNode } from 'react';

/**
 * Fired when the user interacts with an actionable element inside a card.
 * Wire this to `sendAction` from `useConversation`.
 */
export type ConversationCardActionHandler = (actionId: string, value?: string) => void;

export type ConversationCardNodeProps = {
  node: CardElement;
  onAction?: ConversationCardActionHandler;
  /** Renders the node's children through the default pipeline (for overrides that only wrap). */
  renderChildren: (nodes: CardElement[] | undefined) => ReactNode;
};

export type ConversationCardProps = {
  /** Portable Chat SDK card JSON (a `card` message part). */
  card: CardElement;
  onAction?: ConversationCardActionHandler;
  /** Per-node-type overrides; unmatched types fall back to the built-in unstyled renderer. */
  components?: Partial<Record<string, ComponentType<ConversationCardNodeProps>>>;
};

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);

    return SAFE_URL_PROTOCOLS.has(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Unstyled recursive renderer for the portable card vocabulary (`card`,
 * `text`, `divider`, `image`, `actions`, `button`, `link-button`, `link`,
 * `section`, `field`, `fields`). Every element carries a
 * `data-novu-element="<type>"` attribute for styling; unknown node types
 * render their children so newer vocabulary degrades gracefully.
 */
export function ConversationCard(props: ConversationCardProps): ReactNode {
  return renderNode(props.card, { onAction: props.onAction, components: props.components, key: 'root' });
}

type RenderContext = {
  onAction?: ConversationCardActionHandler;
  components?: ConversationCardProps['components'];
  key: string;
};

function renderChildrenFactory(context: RenderContext) {
  return (nodes: CardElement[] | undefined): ReactNode => renderNodes(nodes, context);
}

function renderNodes(nodes: CardElement[] | undefined, context: RenderContext): ReactNode {
  if (!nodes?.length) return null;

  return nodes.map((child, index) => renderNode(child, { ...context, key: `${context.key}.${index}` }));
}

function renderNode(node: CardElement, context: RenderContext): ReactNode {
  if (!node || typeof node !== 'object' || typeof node.type !== 'string') {
    return null;
  }

  const Override = context.components?.[node.type];
  if (Override) {
    return (
      <Override
        key={context.key}
        node={node}
        onAction={context.onAction}
        renderChildren={renderChildrenFactory(context)}
      />
    );
  }

  const { key } = context;
  const children = renderNodes(node.children, context);

  switch (node.type) {
    case 'card':
      return (
        <div key={key} data-novu-element="card">
          {node.title ? <div data-novu-element="card-title">{node.title}</div> : null}
          {node.subtitle ? <div data-novu-element="card-subtitle">{node.subtitle}</div> : null}
          {children}
        </div>
      );
    case 'text':
      return (
        <p key={key} data-novu-element="text">
          {node.content}
        </p>
      );
    case 'divider':
      return <hr key={key} data-novu-element="divider" />;
    case 'image': {
      const src = safeUrl(node.url ?? node.imageUrl);

      return src ? <img key={key} data-novu-element="image" src={src} alt={node.title ?? ''} /> : null;
    }
    case 'actions':
      return (
        <div key={key} data-novu-element="actions">
          {children}
        </div>
      );
    case 'button': {
      const actionId = getCardNodeId(node);

      return (
        <button
          key={key}
          type="button"
          data-novu-element="button"
          data-novu-style={node.style}
          onClick={
            actionId && context.onAction ? () => context.onAction?.(actionId, getCardNodeValue(node)) : undefined
          }
        >
          {node.label ?? node.content}
        </button>
      );
    }
    case 'link-button':
    case 'link': {
      const href = safeUrl(node.url);

      return (
        <a
          key={key}
          data-novu-element={node.type}
          data-novu-style={node.style}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
        >
          {node.label ?? node.content ?? href}
        </a>
      );
    }
    case 'section':
      return (
        <div key={key} data-novu-element="section">
          {node.title ? <div data-novu-element="section-title">{node.title}</div> : null}
          {children}
        </div>
      );
    case 'fields':
      return (
        <dl key={key} data-novu-element="fields">
          {children}
        </dl>
      );
    case 'field': {
      // The chat-sdk Field builder emits `label`; older shapes use `title`.
      const fieldLabel = node.label ?? node.title;

      return (
        <div key={key} data-novu-element="field">
          {fieldLabel ? <dt data-novu-element="field-title">{fieldLabel}</dt> : null}
          <dd data-novu-element="field-value">{node.value ?? node.content}</dd>
        </div>
      );
    }
    default:
      // Unknown vocabulary: render children so nested known nodes still show.
      return <React.Fragment key={key}>{children}</React.Fragment>;
  }
}

export type ConversationMessageContentProps = {
  message: ConversationMessage;
  onAction?: ConversationCardActionHandler;
  components?: ConversationCardProps['components'];
};

/**
 * Convenience renderer for a whole message's parts: text as plain markdown
 * strings (bring your own markdown renderer for rich text), cards through
 * `<ConversationCard>`, files as links, and tool approvals as approve/deny
 * buttons wired to the standard approval action ids.
 */
export function ConversationMessageContent(props: ConversationMessageContentProps): ReactNode {
  const { message, onAction, components } = props;

  return message.parts.map((part, index) => {
    const key = `${message.id}.${index}`;

    switch (part.type) {
      case 'text':
        return (
          <p key={key} data-novu-element="message-text">
            {part.markdown}
          </p>
        );
      case 'card':
        return <ConversationCard key={key} card={part.card} onAction={onAction} components={components} />;
      case 'file': {
        const href = safeUrl(part.url);

        return href ? (
          <a key={key} data-novu-element="message-file" href={href} target="_blank" rel="noreferrer noopener">
            {part.filename ?? href}
          </a>
        ) : null;
      }
      case 'toolApproval':
        return (
          <div key={key} data-novu-element="tool-approval" data-novu-status={part.status}>
            <span data-novu-element="tool-approval-name">{part.toolName ?? 'Tool approval'}</span>
            {part.status === 'pending' && onAction ? (
              // Self-hosted approval action-id grammar (`tool-approval:{verdict}:{approvalId}`,
              // see @novu/framework tool-approval/action-id). Managed agents deliver their
              // approval buttons inside the card part itself, which routes through onAction
              // with the card's own action ids.
              <div data-novu-element="actions">
                <button
                  type="button"
                  data-novu-element="button"
                  data-novu-style="primary"
                  onClick={() => onAction(`tool-approval:approve:${part.approvalId}`)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  data-novu-element="button"
                  data-novu-style="danger"
                  onClick={() => onAction(`tool-approval:deny:${part.approvalId}`)}
                >
                  Deny
                </button>
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  });
}
