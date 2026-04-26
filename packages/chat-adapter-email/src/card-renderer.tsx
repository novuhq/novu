import {
  Body,
  Button,
  Container,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/render';
import React from 'react';

/**
 * Matches the Chat SDK CardElement / CardChild shapes.
 * See: chat/dist/jsx-runtime-*.d.ts
 */
export interface CardNode {
  type: string;
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

function renderChildren(children: CardNode[] | undefined): React.ReactNode {
  if (!children || children.length === 0) return null;

  return children.map((child, i) => <React.Fragment key={i}>{renderNode(child)}</React.Fragment>);
}

function renderNode(node: CardNode): React.ReactNode {
  switch (node.type) {
    case 'card':
      return (
        <Container style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', maxWidth: '600px' }}>
          {node.title && (
            <Heading as="h2" style={{ margin: '0 0 8px', fontSize: '20px' }}>
              {node.title}
            </Heading>
          )}
          {node.subtitle && (
            <Text style={{ margin: '0 0 12px', color: '#666666' }}>{node.subtitle}</Text>
          )}
          {safeUrl(node.imageUrl) && <Img src={safeUrl(node.imageUrl)} alt="" style={{ maxWidth: '100%', marginBottom: '12px' }} />}
          {renderChildren(node.children)}
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
      return <Section style={{ margin: '12px 0' }}>{renderChildren(node.children)}</Section>;

    case 'link-button':
      return (
        <Button href={safeUrl(node.url) ?? '#'} style={{ padding: '8px 16px', margin: '4px', backgroundColor: '#0066cc', color: '#ffffff', borderRadius: '4px', fontSize: '14px', textDecoration: 'none' }}>
          {node.label || ''}
        </Button>
      );

    case 'button':
      if (node.url && safeUrl(node.url)) {
        return (
          <Button href={safeUrl(node.url)} style={{ padding: '8px 16px', margin: '4px', backgroundColor: '#0066cc', color: '#ffffff', borderRadius: '4px', fontSize: '14px', textDecoration: 'none' }}>
            {node.label || ''}
          </Button>
        );
      }

      return (
        <Button href="#" style={{ padding: '8px 16px', margin: '4px', backgroundColor: '#0066cc', color: '#ffffff', borderRadius: '4px', fontSize: '14px', textDecoration: 'none' }}>
          {node.label || ''}
        </Button>
      );

    case 'link':
      return <Link href={safeUrl(node.url) ?? '#'} style={{ color: '#0066cc' }}>{node.label || ''}</Link>;

    case 'section':
      return <Section style={{ margin: '8px 0' }}>{renderChildren(node.children)}</Section>;

    case 'field':
      return (
        <Text style={{ margin: '4px 0' }}>
          <strong>{node.label || ''}</strong>: {node.value || ''}
        </Text>
      );

    case 'fields':
      return <Section style={{ margin: '8px 0' }}>{renderChildren(node.children)}</Section>;

    default:
      return <Text style={{ margin: '4px 0' }}>{node.content || node.label || ''}</Text>;
  }
}

export async function renderCard(card: CardNode): Promise<string> {
  const emailComponent = (
    <Html>
      <Body style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#333333', margin: '0 auto', maxWidth: '600px' }}>
        {renderNode(card)}
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
