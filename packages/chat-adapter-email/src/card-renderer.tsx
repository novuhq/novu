import { Body, Button, Container, Heading, Hr, Html, Img, Link, Section, Text } from '@react-email/components';
import { render } from '@react-email/render';
import React from 'react';
import type { ActionButtonStyle, ActionUrlBuilder } from './types.js';

/**
 * Matches the Chat SDK CardElement / CardChild shapes.
 * See: chat/dist/jsx-runtime-*.d.ts
 */
export interface CardNode {
  type: string;
  /** Set on `button` nodes — the `id` prop of the source `<Button>`. */
  id?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  label?: string;
  value?: string;
  url?: string;
  imageUrl?: string;
  style?: string;
  children?: CardNode[];
  props?: Record<string, unknown>;
}

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

interface RenderContext {
  /** Pre-resolved action URLs keyed by reference to the `button` CardNode. */
  resolvedActionUrls?: Map<CardNode, string>;
}

interface ActionContext {
  threadId: string;
  messageId: string;
  buildActionUrl: ActionUrlBuilder;
}

function getNodeId(node: CardNode): string | undefined {
  if (typeof node.id === 'string' && node.id.length > 0) return node.id;
  const propsId = node.props?.id;

  return typeof propsId === 'string' && propsId.length > 0 ? propsId : undefined;
}

function getNodeValue(node: CardNode): string | undefined {
  if (typeof node.value === 'string') return node.value;
  const propsValue = node.props?.value;

  return typeof propsValue === 'string' ? propsValue : undefined;
}

function getNodeLabel(node: CardNode): string | undefined {
  if (typeof node.label === 'string') return node.label;
  const propsLabel = node.props?.label;

  return typeof propsLabel === 'string' ? propsLabel : undefined;
}

function getNodeStyle(node: CardNode): ActionButtonStyle | undefined {
  const raw = typeof node.style === 'string' ? node.style : node.props?.style;
  if (raw === 'primary' || raw === 'danger' || raw === 'default') return raw;

  return undefined;
}

function collectActionButtons(node: CardNode, out: CardNode[]): void {
  if (node.type === 'button' && getNodeId(node) && !safeUrl(node.url)) {
    out.push(node);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) collectActionButtons(child, out);
  }
}

/**
 * Walks the card tree, calls `buildActionUrl` for every `button` node that has an `id`
 * and no explicit `url`, and returns a Map keyed by node reference. Pre-resolved up-front
 * because `@react-email/render` walks the tree synchronously.
 */
async function resolveActionUrls(card: CardNode, action: ActionContext): Promise<Map<CardNode, string>> {
  const buttons: CardNode[] = [];
  collectActionButtons(card, buttons);
  if (buttons.length === 0) return new Map();

  const entries = await Promise.all(
    buttons.map(async (node) => {
      const url = await action.buildActionUrl({
        threadId: action.threadId,
        messageId: action.messageId,
        actionId: getNodeId(node) as string,
        value: getNodeValue(node),
        label: getNodeLabel(node),
        style: getNodeStyle(node),
      });

      return [node, url] as const;
    })
  );

  return new Map(entries);
}

function renderChildren(children: CardNode[] | undefined, ctx: RenderContext): React.ReactNode {
  if (!children || children.length === 0) return null;

  return children.map((child, i) => <React.Fragment key={i}>{renderNode(child, ctx)}</React.Fragment>);
}

const BUTTON_STYLE = {
  padding: '8px 16px',
  margin: '4px',
  backgroundColor: '#0066cc',
  color: '#ffffff',
  borderRadius: '4px',
  fontSize: '14px',
  textDecoration: 'none',
} as const;

function renderNode(node: CardNode, ctx: RenderContext): React.ReactNode {
  switch (node.type) {
    case 'card':
      return (
        <Container style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', maxWidth: '600px' }}>
          {node.title && (
            <Heading as="h2" style={{ margin: '0 0 8px', fontSize: '20px' }}>
              {node.title}
            </Heading>
          )}
          {node.subtitle && <Text style={{ margin: '0 0 12px', color: '#666666' }}>{node.subtitle}</Text>}
          {safeUrl(node.imageUrl) && (
            <Img src={safeUrl(node.imageUrl)} alt="" style={{ maxWidth: '100%', marginBottom: '12px' }} />
          )}
          {renderChildren(node.children, ctx)}
        </Container>
      );

    case 'text':
      return <Text style={{ margin: '4px 0' }}>{node.content || ''}</Text>;

    case 'divider':
      return <Hr />;

    case 'image':
      return (
        <Img
          src={safeUrl(node.url) ?? safeUrl(node.imageUrl) ?? ''}
          alt={node.label || ''}
          style={{ maxWidth: '100%', margin: '8px 0' }}
        />
      );

    case 'actions':
      return <Section style={{ margin: '12px 0' }}>{renderChildren(node.children, ctx)}</Section>;

    case 'link-button':
      return (
        <Button href={safeUrl(node.url) ?? '#'} style={BUTTON_STYLE}>
          {getNodeLabel(node) || ''}
        </Button>
      );

    case 'button': {
      const resolved = ctx.resolvedActionUrls?.get(node);
      const href = resolved ?? safeUrl(node.url) ?? '#';

      return (
        <Button href={href} style={BUTTON_STYLE}>
          {getNodeLabel(node) || ''}
        </Button>
      );
    }

    case 'link':
      return (
        <Link href={safeUrl(node.url) ?? '#'} style={{ color: '#0066cc' }}>
          {getNodeLabel(node) || ''}
        </Link>
      );

    case 'section':
      return <Section style={{ margin: '8px 0' }}>{renderChildren(node.children, ctx)}</Section>;

    case 'field':
      return (
        <Text style={{ margin: '4px 0' }}>
          <strong>{getNodeLabel(node) || ''}</strong>: {node.value || ''}
        </Text>
      );

    case 'fields':
      return <Section style={{ margin: '8px 0' }}>{renderChildren(node.children, ctx)}</Section>;

    default:
      return <Text style={{ margin: '4px 0' }}>{node.content || getNodeLabel(node) || ''}</Text>;
  }
}

export async function renderCard(card: CardNode, action?: ActionContext): Promise<string> {
  const resolvedActionUrls = action ? await resolveActionUrls(card, action) : undefined;
  const ctx: RenderContext = { resolvedActionUrls };

  const emailComponent = (
    <Html>
      <Body
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#333333',
          margin: '0 auto',
          maxWidth: '600px',
        }}
      >
        {renderNode(card, ctx)}
      </Body>
    </Html>
  );

  return await render(emailComponent);
}

export function extractTextFromCard(card: CardNode): string {
  const parts: string[] = [];
  if (card.title) parts.push(card.title);
  if (card.subtitle) parts.push(card.subtitle);
  if (card.content) parts.push(card.content);
  if (card.label) parts.push(card.label);
  if (card.value) parts.push(card.value);

  if (Array.isArray(card.children)) {
    for (const child of card.children) {
      const childText = extractTextFromCard(child);
      if (childText) parts.push(childText);
    }
  }

  return parts.join('\n');
}
